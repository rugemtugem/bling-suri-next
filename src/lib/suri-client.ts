import type { SuriProduct, SuriOrderDetails } from './types';

const API_BASE = process.env.SURI_API_URL || '';
const API_TOKEN = process.env.SURI_API_TOKEN || '';

async function suriFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE.replace(/\/$/, '')}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });
}

// ========== PRODUTOS ==========

export async function createProduct(product: SuriProduct) {
  const res = await suriFetch('/products', {
    method: 'POST',
    body: JSON.stringify(product),
  });
  return {
    ok: res.ok,
    status: res.status,
    data: await res.json().catch(() => null),
  };
}

export async function updateProduct(productId: string, product: SuriProduct) {
  const res = await suriFetch(`/products/${encodeURIComponent(productId)}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  });
  return {
    ok: res.ok,
    status: res.status,
    data: await res.json().catch(() => null),
  };
}

// ========== PEDIDOS ==========

export async function getOrderDetails(orderId: string): Promise<SuriOrderDetails | null> {
  const res = await suriFetch(`/orders/${orderId}`);
  if (!res.ok) return null;

  const data = await res.json();
  // API can return { success: true, data: {...} } or direct data
  if (data?.success && data?.data) return data.data;
  return data;
}

// ========== STATUS ==========

export async function markOrderPaid(orderId: string, paymentTracking = '') {
  const res = await suriFetch('/orders/paid', {
    method: 'POST',
    body: JSON.stringify({ orderId, paymentTracking }),
  });
  return { success: res.ok, status: res.status };
}

export async function cancelOrder(orderId: string) {
  const res = await suriFetch('/orders/cancel', {
    method: 'POST',
    body: JSON.stringify({ orderId }),
  });
  return { success: res.ok, status: res.status };
}

export async function updateLogistic(orderId: string, logisticStatus: number) {
  const res = await suriFetch('/orders/logistic', {
    method: 'POST',
    body: JSON.stringify({ id: orderId, status: logisticStatus }),
  });
  return { success: res.ok, status: res.status };
}
