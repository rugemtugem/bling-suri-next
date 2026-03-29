import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStoredToken } from '@/lib/token-manager';

export async function GET() {
  try {
    const [
      totalOrders,
      todayOrders,
      totalProducts,
      recentLogs,
      ordersByStatus,
      tokenData,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.product.count(),
      prisma.syncLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.order.groupBy({ by: ['status'], _count: { id: true } }),
      getStoredToken(),
    ]);

    const successRate = totalOrders > 0
      ? Math.round(
          ((await prisma.order.count({ where: { status: { not: 'error' } } })) / totalOrders) * 100
        )
      : 100;

    const lastSync = await prisma.syncLog.findFirst({
      where: { type: 'product', action: 'sync' },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalOrders,
          todayOrders,
          totalProducts,
          successRate,
        },
        tokenStatus: tokenData
          ? { valid: tokenData.expiresAt > new Date(), expiresAt: tokenData.expiresAt }
          : { valid: false, expiresAt: null },
        lastProductSync: lastSync?.createdAt || null,
        recentActivity: recentLogs,
        ordersByStatus: ordersByStatus.reduce(
          (acc, item) => ({ ...acc, [item.status]: item._count.id }),
          {} as Record<string, number>
        ),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
