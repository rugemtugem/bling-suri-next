import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bling from '@/lib/bling-client';
import * as suri from '@/lib/suri-client';
import type { SuriWebhookPayload, BlingContact } from '@/lib/types';

function formatPhone(raw: string): { telefone?: string; celular?: string } {
  let digits = raw.replace(/\D/g, '');
  if (digits.length >= 12 && digits.startsWith('55')) digits = digits.slice(2);
  if (digits.length === 11) {
    return { celular: `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}` };
  }
  if (digits.length === 10) {
    return { telefone: `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}` };
  }
  return {};
}

function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  for (let t = 9; t < 11; t++) {
    let d = 0;
    for (let c = 0; c < t; c++) d += parseInt(digits[c]) * ((t + 1) - c);
    d = ((10 * d) % 11) % 10;
    if (parseInt(digits[t]) !== d) return false;
  }
  return true;
}

async function processOrderCreated(orderId: string) {
  // Check if already processed
  const existing = await prisma.order.findUnique({ where: { suriOrderId: orderId } });
  if (existing?.blingOrderId) {
    return { success: true, alreadyProcessed: true, blingOrderId: existing.blingOrderId };
  }

  // Fetch order details from Suri
  const details = await suri.getOrderDetails(orderId);
  if (!details) throw new Error('Falha ao buscar pedido na Suri');

  const customer = details.customer;
  const suriOrderId = details.providerOrderId || details.id || orderId;

  // Format contact data
  const doc = (customer.document || '').replace(/\D/g, '');
  const phoneData = customer.phone ? formatPhone(customer.phone) : {};
  
  const contactData: BlingContact = {
    nome: customer.name || 'Cliente',
    numeroDocumento: doc.length === 11 && validateCPF(doc) ? doc : '12345678909',
    tipoPessoa: doc.length === 14 ? 'J' : 'F',
    email: customer.email,
    ...phoneData,
  };

  // Find or create contact in Bling
  const contactId = await bling.findOrCreateContact(contactData);
  if (!contactId) throw new Error('Falha ao criar contato na Bling');

  // Map order items
  const items = [];
  let totalAmount = 0;
  for (const item of details.items || []) {
    const sku = item.sku || item.productSku || '';
    if (!sku) continue;
    const qty = item.quantity || 1;
    const price = item.price || item.unitPrice || 0;
    
    const blingItem: Record<string, unknown> = {
      codigo: sku,
      descricao: item.name || item.productName || `Produto SKU ${sku}`,
      unidade: 'UN',
      quantidade: qty,
      valor: price,
    };

    const blingProductId = await bling.findProductBySku(sku);
    if (blingProductId) blingItem.produto = { id: blingProductId };

    items.push(blingItem);
    totalAmount += qty * price;
  }

  if (!items.length) throw new Error('Pedido sem itens válidos');

  // Build transport/shipping
  let transporte: Record<string, unknown> | undefined;
  if (customer.address) {
    const addr = customer.address;
    transporte = {
      endereco: {
        endereco: addr.street || '',
        numero: addr.number || 'S/N',
        complemento: addr.complement || '',
        bairro: addr.neighborhood || '',
        cep: (addr.zipCode || '').replace(/\D/g, ''),
        municipio: addr.city || '',
        uf: addr.state || '',
        pais: 'Brasil',
      },
    };
    if (details.logistic?.price) transporte.frete = details.logistic.price;
    if (details.logistic?.carrier) transporte.transportadora = { nome: details.logistic.carrier };
  }

  // Create order in Bling
  const blingOrder = {
    numero: suriOrderId,
    data: new Date().toISOString().split('T')[0],
    contato: { id: contactId },
    itens: items,
    ...(transporte ? { transporte } : {}),
    observacoes: `Pedido importado da Suri em ${new Date().toLocaleString('pt-BR')}`,
    observacoesInternas: `Suri Order ID: ${orderId}`,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result = await bling.createOrder(blingOrder as any);

  // If order already exists in Bling, treat as success
  if (!result.success && result.error?.includes('Já foi lançado um pedido')) {
    result = { success: true, orderId: suriOrderId, numero: suriOrderId };
  }

  // Save to database
  await prisma.order.upsert({
    where: { suriOrderId: orderId },
    update: {
      blingOrderId: result.success ? String(result.orderId) : null,
      status: result.success ? 'processing' : 'error',
      lastError: result.success ? null : result.error,
      processedAt: result.success ? new Date() : null,
      retryCount: existing ? existing.retryCount + 1 : 0,
    },
    create: {
      suriOrderId: orderId,
      blingOrderId: result.success ? String(result.orderId) : null,
      customerName: customer.name || 'Cliente',
      customerDoc: doc || null,
      customerEmail: customer.email || null,
      customerPhone: customer.phone || null,
      totalAmount,
      shippingCost: details.logistic?.price || 0,
      status: result.success ? 'processing' : 'error',
      blingStatus: result.success ? 'Em aberto' : null,
      itemsJson: JSON.stringify(items),
      addressJson: customer.address ? JSON.stringify(customer.address) : null,
      lastError: result.success ? null : result.error,
      processedAt: result.success ? new Date() : null,
    },
  });

  await prisma.syncLog.create({
    data: {
      type: 'order',
      action: 'create',
      result: result.success ? 'success' : 'error',
      message: result.success ? `Bling #${result.orderId}` : result.error,
    },
  });

  return result;
}

async function processStatusEvent(orderId: string, event: string) {
  const order = await prisma.order.findUnique({ where: { suriOrderId: orderId } });
  if (!order?.blingOrderId) {
    return { success: false, error: 'Pedido não encontrado no mapeamento' };
  }

  const situacaoId = event === 'OrdersPaid' ? 15 : 12;
  const statusLabel = event === 'OrdersPaid' ? 'Em andamento' : 'Cancelado';
  const orderStatus = event === 'OrdersPaid' ? 'paid' : 'canceled';

  const success = await bling.updateOrderStatus(order.blingOrderId, situacaoId);

  if (success) {
    await prisma.order.update({
      where: { suriOrderId: orderId },
      data: { status: orderStatus, blingStatus: statusLabel },
    });
    await prisma.statusLog.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: orderStatus,
        source: 'suri',
        details: `Webhook: ${event}`,
      },
    });
  }

  return { success, blingOrderId: order.blingOrderId, status: statusLabel };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();

    // Log every incoming webhook call
    try {
      await prisma.syncLog.create({
        data: {
          type: 'webhook',
          action: 'incoming',
          result: 'info',
          message: rawBody.slice(0, 500),
          details: request.headers.get('user-agent'),
        },
      });
    } catch { /* don't fail on log error */ }

    let payload: SuriWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ success: false, error: 'JSON inválido' }, { status: 400 });
    }

    const { OrderId, HookEvent } = payload;

    if (!OrderId || !HookEvent) {
      return NextResponse.json({ success: false, error: 'Payload inválido', received: payload }, { status: 400 });
    }

    // Status events (Paid/Canceled)
    if (HookEvent === 'OrdersPaid' || HookEvent === 'OrdersCanceled') {
      const result = await processStatusEvent(OrderId, HookEvent);
      return NextResponse.json({ success: result.success, data: result });
    }

    // Order creation
    if (HookEvent === 'OrdersCreated') {
      const result = await processOrderCreated(OrderId);
      return NextResponse.json({ success: result.success, data: result });
    }

    return NextResponse.json({ success: true, message: `Evento '${HookEvent}' ignorado` });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
