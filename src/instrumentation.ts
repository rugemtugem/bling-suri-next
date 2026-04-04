// Auto-refresh Bling token + Auto-sync status
// This file runs when the Next.js server starts

export async function register() {
  // Only run on the server, not during build
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const TOKEN_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
    const STATUS_INTERVAL = 5 * 60 * 1000; // 5 minutes

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // ========== TOKEN REFRESH ==========
    const refreshToken = async () => {
      try {
        const { ensureValidToken } = await import('@/lib/token-manager');
        const token = await ensureValidToken();
        console.log(`[Auto-Refresh] ${token ? '✅ Token válido' : '⚠️ Token inválido'} - ${new Date().toISOString()}`);
      } catch (err) {
        console.error('[Auto-Refresh] ❌ Erro:', err);
      }
    };

    // ========== STATUS SYNC ==========
    const syncStatus = async () => {
      try {
        const res = await fetch(`${appUrl}/api/sync/status`, { method: 'POST' });
        const data = await res.json();
        const info = data?.data || data;
        if (info.checked > 0 || info.synced > 0) {
          console.log(`[Auto-Sync] 🔄 Checked: ${info.checked}, Synced: ${info.synced}, Errors: ${info.errors || 0}`);
        }
      } catch (err) {
        console.error('[Auto-Sync] ❌ Erro:', err);
      }
    };

    // Schedule tasks after server stabilizes
    setTimeout(() => {
      refreshToken();
      setInterval(refreshToken, TOKEN_INTERVAL);

      syncStatus();
      setInterval(syncStatus, STATUS_INTERVAL);
    }, 30_000);

    console.log('[Scheduler] 🔄 Token refresh (4h) + Status sync (5min) agendados');
  }
}
