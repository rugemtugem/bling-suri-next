import { prisma } from './prisma';
import type { BlingTokenResponse } from './types';

const BLING_TOKEN_URL = 'https://www.bling.com.br/Api/v3/oauth/token';

export async function getStoredToken() {
  const token = await prisma.token.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  return token;
}

export async function saveToken(accessToken: string, refreshToken: string, expiresIn: number) {
  // Remove old tokens
  await prisma.token.deleteMany();
  
  return prisma.token.create({
    data: {
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    },
  });
}

export async function refreshBlingToken(refreshToken: string): Promise<BlingTokenResponse | null> {
  const clientId = process.env.BLING_CLIENT_ID!;
  const clientSecret = process.env.BLING_CLIENT_SECRET!;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const res = await fetch(BLING_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      await logSync('token', 'refresh', 'error', `HTTP ${res.status}`);
      return null;
    }

    const data: BlingTokenResponse = await res.json();
    await saveToken(data.access_token, data.refresh_token, data.expires_in);
    await logSync('token', 'refresh', 'success', `Expires in ${data.expires_in}s`);
    return data;
  } catch (err) {
    await logSync('token', 'refresh', 'error', String(err));
    return null;
  }
}

export async function ensureValidToken(): Promise<string | null> {
  const stored = await getStoredToken();
  if (!stored) return null;

  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  if (stored.expiresAt > oneHourFromNow) {
    return stored.accessToken;
  }

  // Token expiring soon or expired — refresh
  const refreshed = await refreshBlingToken(stored.refreshToken);
  return refreshed?.access_token ?? null;
}

async function logSync(type: string, action: string, result: string, message?: string) {
  try {
    await prisma.syncLog.create({
      data: { type, action, result, message },
    });
  } catch {
    console.error(`[SyncLog] ${type}/${action}: ${result} - ${message}`);
  }
}
