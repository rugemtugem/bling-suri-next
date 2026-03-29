import { ensureValidToken } from './token-manager';
import { prisma } from './prisma';
import type { BlingProduct, BlingContact, BlingOrder } from './types';

const API_BASE = process.env.BLING_API_URL || 'https://www.bling.com.br/Api/v3';
const RATE_LIMIT_MS = 350;

let lastRequest = 0;

async function blingFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await ensureValidToken();
  if (!token) throw new Error('Token Bling indisponível');

  // Rate limiting
  const now = Date.now();
  const elapsed = now - lastRequest;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequest = Date.now();

  const url = `${API_BASE.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  return res;
}

// ========== PRODUTOS ==========

export async function fetchAllProducts(since?: string): Promise<BlingProduct[]> {
  const dataInicial = since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const all: BlingProduct[] = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const params = new URLSearchParams({
      dataAlteracaoInicial: dataInicial,
      pagina: String(page),
      limite: String(limit),
    });

    const res = await blingFetch(`/produtos?${params}`);
    if (!res.ok) break;

    const data = await res.json();
    if (!data.data?.length) break;

    all.push(...data.data);
    if (data.data.length < limit) break;
    page++;
  }

  return all;
}

export async function findProductBySku(sku: string): Promise<number | null> {
  // Check DB cache first
  const cached = await prisma.product.findUnique({ where: { sku } });
  if (cached?.blingId) return parseInt(cached.blingId);

  // Search Bling API
  const res = await blingFetch(`/produtos?codigo=${encodeURIComponent(sku)}`);
  if (!res.ok) return null;

  const data = await res.json();
  if (data.data?.length) {
    const productId = data.data[0].id;
    await prisma.product.upsert({
      where: { sku },
      update: { blingId: String(productId) },
      create: { sku, blingId: String(productId), name: data.data[0].descricao || sku },
    });
    return productId;
  }
  return null;
}

// ========== CONTATOS ==========

export async function findOrCreateContact(contact: BlingContact): Promise<number | null> {
  const doc = contact.numeroDocumento;
  
  // Search by CPF/CNPJ
  const searchRes = await blingFetch(`/contatos?pesquisa=${encodeURIComponent(doc)}&criterio=1`);
  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.data?.length) return data.data[0].id;
  }

  // Search by name
  const nameRes = await blingFetch(`/contatos?pesquisa=${encodeURIComponent(contact.nome)}&criterio=1`);
  if (nameRes.ok) {
    const data = await nameRes.json();
    if (data.data?.length) return data.data[0].id;
  }

  // Create new contact
  const createRes = await blingFetch('/contatos', {
    method: 'POST',
    body: JSON.stringify({
      nome: contact.nome,
      numeroDocumento: contact.numeroDocumento,
      tipo: contact.tipoPessoa,
      situacao: 'A',
      ...(contact.celular ? { celular: contact.celular } : {}),
      ...(contact.telefone ? { telefone: contact.telefone } : {}),
      ...(contact.email ? { email: contact.email } : {}),
    }),
  });

  if (createRes.ok) {
    const data = await createRes.json();
    return data.data?.id ?? null;
  }

  // If CPF already exists, re-search
  const errData = await createRes.json().catch(() => null);
  if (errData?.error?.fields?.some((f: { msg?: string }) => f.msg?.includes('já está cadastrado'))) {
    const retryRes = await blingFetch(`/contatos?numeroDocumento=${encodeURIComponent(doc)}&criterio=1`);
    if (retryRes.ok) {
      const data = await retryRes.json();
      if (data.data?.length) return data.data[0].id;
    }
  }

  return null;
}

// ========== PEDIDOS ==========

export async function createOrder(order: BlingOrder) {
  const res = await blingFetch('/pedidos/vendas', {
    method: 'POST',
    body: JSON.stringify(order),
  });

  const data = await res.json();

  if (res.ok) {
    return { success: true, orderId: data.data?.id, numero: data.data?.numero };
  }

  return { success: false, error: `HTTP ${res.status}: ${JSON.stringify(data)}` };
}

export async function getOrderStatus(blingOrderId: string) {
  const res = await blingFetch(`/pedidos/vendas/${blingOrderId}`);
  if (!res.ok) return null;

  const data = await res.json();
  return data.data ?? null;
}

export async function updateOrderStatus(blingOrderId: string, situacaoId: number) {
  const res = await blingFetch(`/pedidos/vendas/${blingOrderId}/situacoes/${situacaoId}`, {
    method: 'PATCH',
  });
  return res.ok;
}
