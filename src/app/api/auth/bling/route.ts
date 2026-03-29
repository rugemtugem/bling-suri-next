import { NextRequest, NextResponse } from 'next/server';
import { saveToken } from '@/lib/token-manager';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const clientId = process.env.BLING_CLIENT_ID!;
  const clientSecret = process.env.BLING_CLIENT_SECRET!;
  const redirectUri = process.env.BLING_REDIRECT_URI!;
  const basePath = process.env.NEXT_PUBLIC_APP_URL || '/bling-suri-next';

  if (error) {
    return NextResponse.json({ success: false, error }, { status: 400 });
  }

  if (!code) {
    // Redirect to Bling OAuth
    const authUrl = new URL('https://www.bling.com.br/Api/v3/oauth/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', crypto.randomUUID());
    return NextResponse.redirect(authUrl.toString());
  }

  // Exchange code for token
  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return NextResponse.json({ success: false, error: `HTTP ${res.status}: ${errBody}` }, { status: 400 });
    }

    const data = await res.json();
    await saveToken(data.access_token, data.refresh_token, data.expires_in || 21600);

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/', basePath));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
