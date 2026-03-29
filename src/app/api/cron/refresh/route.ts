import { NextResponse } from 'next/server';
import { ensureValidToken } from '@/lib/token-manager';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const token = await ensureValidToken();

    await prisma.syncLog.create({
      data: {
        type: 'token',
        action: 'refresh',
        result: token ? 'success' : 'error',
        message: token ? 'Token válido' : 'Falha na renovação',
      },
    });

    return NextResponse.json({
      success: !!token,
      message: token ? 'Token válido' : 'Token inválido — re-autenticação necessária',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
