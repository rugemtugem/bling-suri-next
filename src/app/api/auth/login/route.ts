import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(request: NextRequest) {
  try {
    const { email, password, action } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'contato@rugemtugem.dev';

    // Only allow the admin email
    if (email !== adminEmail) {
      return NextResponse.json({ success: false, error: 'Acesso não autorizado' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (action === 'register') {
      // First-time registration
      if (user) {
        return NextResponse.json({ success: false, error: 'Conta já existe. Faça login.' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await prisma.user.create({
        data: { email, password: hashedPassword, name: 'Admin' },
      });

      const token = jwt.sign({ userId: newUser.id, email }, JWT_SECRET, { expiresIn: '7d' });

      const response = NextResponse.json({ success: true, message: 'Conta criada com sucesso' });
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });
      return response;
    }

    // Login
    if (!user) {
      return NextResponse.json({ success: false, error: 'Conta não encontrada. Cadastre-se primeiro.', needsRegister: true }, { status: 404 });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json({ success: false, error: 'Senha incorreta' }, { status: 401 });
    }

    const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: '7d' });

    const response = NextResponse.json({ success: true, message: 'Login realizado' });
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
