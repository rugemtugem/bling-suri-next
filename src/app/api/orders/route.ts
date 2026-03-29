import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (status && status !== 'all') where.status = status;
    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { suriOrderId: { contains: search } },
        { blingOrderId: { contains: search } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { statusLogs: { orderBy: { createdAt: 'desc' }, take: 3 } },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { orders, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
