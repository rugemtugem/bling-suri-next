// Auto-refresh Bling token every 4 hours
// This file runs when the Next.js server starts

export async function register() {
  // Only run on the server, not during build
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const REFRESH_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours

    const refreshToken = async () => {
      try {
        const { ensureValidToken } = await import('@/lib/token-manager');
        const token = await ensureValidToken();
        console.log(`[Auto-Refresh] ${token ? '✅ Token válido' : '⚠️ Token inválido'} - ${new Date().toISOString()}`);
      } catch (err) {
        console.error('[Auto-Refresh] ❌ Erro:', err);
      }
    };

    // First refresh after 30 seconds (let server stabilize)
    setTimeout(() => {
      refreshToken();
      // Then every 4 hours
      setInterval(refreshToken, REFRESH_INTERVAL);
    }, 30_000);

    console.log('[Auto-Refresh] 🔄 Token auto-refresh schedulado (cada 4h)');
  }
}
