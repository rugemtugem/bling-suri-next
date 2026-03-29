import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as bling from '@/lib/bling-client';
import * as suri from '@/lib/suri-client';
import { BLING_STATUS_MAP } from '@/lib/types';

export async function POST() {
  let checked = 0, synced = 0, errors = 0;

  try {
    // Get recent orders from DB that aren't finalized
    const orders = await prisma.order.findMany({
      where: {
        blingOrderId: { not: null },
        status: { notIn: ['canceled', 'delivered'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (!orders.length) {
      return NextResponse.json({ success: true, data: { message: 'Nenhum pedido para verificar' } });
    }

    for (const order of orders) {
      if (!order.blingOrderId) continue;
      checked++;

      try {
        const blingOrder = await bling.getOrderStatus(order.blingOrderId);
        if (!blingOrder) { errors++; continue; }

        const currentStatusId = blingOrder.situacao?.id;
        const currentStatusName = blingOrder.situacao?.valor || 'Desconhecido';

        if (!currentStatusId) continue;

        // Check if status changed
        if (currentStatusName === order.blingStatus) continue;

        const statusConfig = BLING_STATUS_MAP[currentStatusId];
        if (!statusConfig) continue;

        let actionSuccess = true;

        switch (statusConfig.action) {
          case 'paid':
            actionSuccess = (await suri.markOrderPaid(order.suriOrderId)).success;
            break;
          case 'cancel':
            actionSuccess = (await suri.cancelOrder(order.suriOrderId)).success;
            break;
          case 'logistic':
            if (statusConfig.logisticStatus !== undefined) {
              actionSuccess = (await suri.updateLogistic(order.suriOrderId, statusConfig.logisticStatus)).success;
            }
            break;
          case 'none':
            break;
        }

        if (actionSuccess) {
          const newStatus = statusConfig.action === 'paid' ? 'paid'
            : statusConfig.action === 'cancel' ? 'canceled'
            : statusConfig.logisticStatus === 4 ? 'delivered'
            : statusConfig.logisticStatus === 3 ? 'shipped'
            : order.status;

          await prisma.order.update({
            where: { id: order.id },
            data: { status: newStatus, blingStatus: currentStatusName },
          });

          await prisma.statusLog.create({
            data: {
              orderId: order.id,
              fromStatus: order.blingStatus || order.status,
              toStatus: currentStatusName,
              source: 'bling',
              details: `Bling situação: ${currentStatusId} (${statusConfig.label})`,
            },
          });

          synced++;
        } else {
          errors++;
        }

        await new Promise((r) => setTimeout(r, 200));
      } catch {
        errors++;
      }
    }

    await prisma.syncLog.create({
      data: {
        type: 'status',
        action: 'sync',
        result: errors === 0 ? 'success' : 'error',
        message: `Checked: ${checked}, Synced: ${synced}, Errors: ${errors}`,
      },
    });

    return NextResponse.json({ success: true, data: { checked, synced, errors } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
