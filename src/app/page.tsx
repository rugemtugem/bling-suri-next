'use client';

import { useState, useEffect, useCallback } from 'react';

// ========== TYPES ==========

interface DashboardData {
  metrics: {
    totalOrders: number;
    todayOrders: number;
    totalProducts: number;
    successRate: number;
  };
  tokenStatus: { valid: boolean; expiresAt: string | null };
  lastProductSync: string | null;
  recentActivity: Array<{
    id: number;
    type: string;
    action: string;
    result: string;
    message: string | null;
    createdAt: string;
  }>;
  ordersByStatus: Record<string, number>;
}

interface Order {
  id: number;
  suriOrderId: string;
  blingOrderId: string | null;
  customerName: string;
  totalAmount: number;
  status: string;
  blingStatus: string | null;
  createdAt: string;
}

interface SyncResult {
  message?: string;
  error?: string;
  data?: Record<string, unknown>;
}

// ========== HELPERS ==========

const basePath = '';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getActivityIcon(type: string, result: string) {
  if (result === 'error') return { emoji: '❌', cls: 'error' };
  if (result === 'skipped') return { emoji: '⏭️', cls: 'warning' };
  if (type === 'product') return { emoji: '📦', cls: 'success' };
  if (type === 'order') return { emoji: '🛒', cls: 'success' };
  if (type === 'status') return { emoji: '📊', cls: 'info' };
  if (type === 'token') return { emoji: '🔑', cls: 'info' };
  return { emoji: '⚡', cls: 'info' };
}

// ========== LOGIN COMPONENT ==========

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('contato@rugemtugem.dev');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${basePath}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, action: isRegister ? 'register' : 'login' }),
      });

      const data = await res.json();

      if (data.success) {
        onLogin();
      } else if (data.needsRegister) {
        setIsRegister(true);
        setError('Conta não encontrada. Cadastre sua senha abaixo.');
      } else {
        setError(data.error || 'Erro ao autenticar');
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">⚡</div>
          <h1>Bling × Suri</h1>
          <p>Painel de Integração</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@rugemtugem.dev"
              required
            />
          </div>
          <div className="form-group">
            <label>{isRegister ? 'Criar Senha' : 'Senha'}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? 'Crie uma senha segura' : 'Sua senha'}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : isRegister ? '🔐 Cadastrar' : '🚀 Entrar'}
          </button>
        </form>

        <div className="login-toggle">
          {isRegister ? (
            <>Já tem conta? <button onClick={() => setIsRegister(false)}>Fazer login</button></>
          ) : (
            <>Primeiro acesso? <button onClick={() => setIsRegister(true)}>Cadastrar senha</button></>
          )}
        </div>
      </div>
    </div>
  );
}

// ========== DASHBOARD COMPONENT ==========

function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${basePath}/api/dashboard`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);

      const res = await fetch(`${basePath}/api/orders?${params}`);
      const json = await res.json();
      if (json.success) {
        setOrders(json.data.orders);
        setTotalOrders(json.data.total);
        setTotalPages(json.data.totalPages);
      }
    } catch (err) {
      console.error('Orders fetch error:', err);
    }
  }, [page, statusFilter, search]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboard();
      fetchOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard, fetchOrders]);

  async function handleSync(type: 'products' | 'status') {
    setSyncing(type);
    setSyncResult(null);
    try {
      const res = await fetch(`${basePath}/api/sync/${type}`, { method: 'POST' });
      const json = await res.json();
      setSyncResult(json.success ? { data: json.data } : { error: json.error });
      fetchDashboard();
      if (type === 'status') fetchOrders();
    } catch {
      setSyncResult({ error: 'Erro de conexão' });
    } finally {
      setSyncing(null);
    }
  }

  const tokenValid = data?.tokenStatus?.valid;
  const tokenExpires = data?.tokenStatus?.expiresAt
    ? new Date(data.tokenStatus.expiresAt)
    : null;
  const tokenHoursLeft = tokenExpires
    ? Math.max(0, Math.round((tokenExpires.getTime() - Date.now()) / 3600000))
    : 0;

  return (
    <div className="dashboard">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="header-left">
          <span className="header-logo">⚡</span>
          <span className="header-title">Bling × Suri</span>
        </div>
        <div className="header-right">
          <div className="token-status">
            <span className={`status-dot ${tokenValid ? (tokenHoursLeft < 2 ? 'warning' : 'active') : 'expired'}`} />
            {tokenValid ? `Token: ${tokenHoursLeft}h restantes` : 'Token expirado'}
          </div>
          <a href={`${basePath}/api/auth/bling`} className="btn btn-action">🔑 Autenticar Bling</a>
        </div>
      </header>

      <div className="dashboard-content">
        {/* METRICS */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon">🛒</div>
            <div className="metric-label">Pedidos Hoje</div>
            <div className="metric-value">{data?.metrics.todayOrders ?? '—'}</div>
            <div className="metric-sub">{data?.metrics.totalOrders ?? 0} total</div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">📦</div>
            <div className="metric-label">Produtos Sincronizados</div>
            <div className="metric-value">{data?.metrics.totalProducts ?? '—'}</div>
            <div className="metric-sub">Último sync: {data?.lastProductSync ? formatDate(data.lastProductSync) : 'Nunca'}</div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">✅</div>
            <div className="metric-label">Taxa de Sucesso</div>
            <div className="metric-value">{data?.metrics.successRate ?? 100}%</div>
            <div className="metric-sub">Pedidos processados</div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">📊</div>
            <div className="metric-label">Por Status</div>
            <div className="metric-value" style={{ fontSize: '1rem' }}>
              {data?.ordersByStatus ? Object.entries(data.ordersByStatus).map(([s, c]) => (
                <span key={s} style={{ marginRight: 12 }}>
                  <span className={`status-badge status-${s}`}>{s}</span> {c}
                </span>
              )) : '—'}
            </div>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="dashboard-grid">
          {/* ORDERS TABLE */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title">🛒 Pedidos Recentes</h2>
              <span className="page-info">{totalOrders} pedidos</span>
            </div>
            <div className="table-controls">
              <input
                type="text"
                className="search-input"
                placeholder="🔍 Buscar por nome, ID Suri ou Bling..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              >
                <option value="all">Todos</option>
                <option value="pending">Pendente</option>
                <option value="processing">Processando</option>
                <option value="paid">Pago</option>
                <option value="shipped">Enviado</option>
                <option value="delivered">Entregue</option>
                <option value="canceled">Cancelado</option>
                <option value="error">Erro</option>
              </select>
            </div>
            {orders.length > 0 ? (
              <>
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Pedido Suri</th>
                      <th>Cliente</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th>Bling</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td>#{order.suriOrderId}</td>
                        <td>{order.customerName}</td>
                        <td>{formatCurrency(order.totalAmount)}</td>
                        <td><span className={`status-badge status-${order.status}`}>{order.status}</span></td>
                        <td style={{ color: order.blingOrderId ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                          {order.blingOrderId ? `#${order.blingOrderId}` : '—'}
                        </td>
                        <td>{formatDate(order.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="pagination">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>← Anterior</button>
                  <span className="page-info">{page} de {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Próximo →</button>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-text">Nenhum pedido encontrado</div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {/* SYNC PANEL */}
            <div className="panel">
              <div className="panel-header">
                <h2 className="panel-title">🔄 Sincronização</h2>
              </div>
              <div className="panel-body">
                <div className="sync-actions">
                  <div className="sync-card">
                    <div className="sync-info">
                      <span className="sync-icon">📦</span>
                      <div>
                        <div className="sync-label">Produtos</div>
                        <div className="sync-desc">Bling → Suri</div>
                      </div>
                    </div>
                    <button
                      className="btn btn-sync"
                      onClick={() => handleSync('products')}
                      disabled={syncing !== null}
                    >
                      {syncing === 'products' ? <span className="spinner" /> : 'Sync'}
                    </button>
                  </div>
                  <div className="sync-card">
                    <div className="sync-info">
                      <span className="sync-icon">📊</span>
                      <div>
                        <div className="sync-label">Status</div>
                        <div className="sync-desc">Bling ↔ Suri</div>
                      </div>
                    </div>
                    <button
                      className="btn btn-sync"
                      onClick={() => handleSync('status')}
                      disabled={syncing !== null}
                    >
                      {syncing === 'status' ? <span className="spinner" /> : 'Sync'}
                    </button>
                  </div>
                  {syncResult && (
                    <div className={`sync-result ${syncResult.error ? 'error' : ''}`}>
                      {syncResult.error
                        ? `❌ ${syncResult.error}`
                        : `✅ ${JSON.stringify(syncResult.data)}`}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ACTIVITY FEED */}
            <div className="panel">
              <div className="panel-header">
                <h2 className="panel-title">📡 Atividade Recente</h2>
              </div>
              <div className="panel-body">
                {data?.recentActivity?.length ? (
                  <div className="activity-feed">
                    {data.recentActivity.map((item, i) => {
                      const icon = getActivityIcon(item.type, item.result);
                      return (
                        <div key={item.id} className="activity-item" style={{ animationDelay: `${i * 0.05}s` }}>
                          <div className={`activity-icon ${icon.cls}`}>{icon.emoji}</div>
                          <div className="activity-content">
                            <div className="activity-message">
                              <strong>{item.type}</strong> → {item.action}: {item.message || item.result}
                            </div>
                            <div className="activity-time">{formatDate(item.createdAt)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <div className="empty-state-text">Nenhuma atividade ainda</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========== MAIN PAGE ==========

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if already authenticated (cookie exists)
    fetch(`${basePath}/api/dashboard`)
      .then((res) => {
        setAuthenticated(res.ok);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="login-container">
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage onLogin={() => setAuthenticated(true)} />;
  }

  return <Dashboard />;
}
