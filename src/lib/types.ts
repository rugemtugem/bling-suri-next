// ========== BLING TYPES ==========

export interface BlingProduct {
  id: number;
  codigo: string;
  descricao: string;
  descricaoComplementar?: string;
  preco: number;
  precoCusto?: number;
  pesoLiquido?: number;
  pesoBruto?: number;
  situacao?: string;
  imagens?: Array<{ link: string }>;
  estoques?: Array<{ saldoVirtualTotal: number }>;
}

export interface BlingOrderItem {
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor: number;
  produto?: { id: number };
}

export interface BlingOrder {
  numero: string;
  data: string;
  contato: { id: number };
  itens: BlingOrderItem[];
  transporte?: {
    endereco?: {
      endereco: string;
      numero: string;
      complemento: string;
      bairro: string;
      cep: string;
      municipio: string;
      uf: string;
      pais: string;
    };
    frete?: number;
    transportadora?: { nome: string };
  };
  observacoes?: string;
  observacoesInternas?: string;
}

export interface BlingContact {
  id?: number;
  nome: string;
  numeroDocumento: string;
  tipoPessoa: 'F' | 'J';
  email?: string;
  telefone?: string;
  celular?: string;
  situacao?: string;
}

export interface BlingTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

// ========== SURI TYPES ==========

export interface SuriProduct {
  id: string;
  sku: string;
  categoryId: string;
  subcategoryId: string | null;
  brand: string | null;
  sellerId: string;
  sellerName: string | null;
  isActive: boolean;
  name: string;
  description: string;
  url: string | null;
  price: number;
  promotionalPrice: number;
  hasShippingRestriction: boolean;
  images: Array<{
    providerId: string | null;
    url: string;
    description: string | null;
  }>;
  attributes: unknown[];
  dimensions: Array<{
    sku: string;
    dimensions: Record<string, unknown>;
    image: string | null;
    measurements: {
      weightInGrams: number;
      heightInCm: number;
      widthInCm: number;
      lengthInCm: number;
      unitsPerPackage: number;
    };
    price: number;
    priceTables: Record<string, unknown>;
    stocks: Record<string, unknown>;
  }>;
  weightInGrams: number;
}

export interface SuriWebhookPayload {
  OrderId: string;
  HookEvent: 'OrdersCreated' | 'OrdersPaid' | 'OrdersCanceled';
}

export interface SuriOrderDetails {
  id: string;
  providerOrderId?: string;
  customer: {
    name: string;
    document: string;
    email?: string;
    phone?: string;
    address?: {
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  items: Array<{
    productId?: string;
    sku: string;
    productSku?: string;
    name: string;
    productName?: string;
    quantity: number;
    price: number;
    unitPrice?: number;
  }>;
  logistic?: {
    type?: string;
    price?: number;
    deliveryTime?: string;
    carrier?: string;
  };
}

// ========== STATUS MAPS ==========

export const BLING_STATUS_MAP: Record<number, {
  action: 'none' | 'paid' | 'cancel' | 'logistic';
  label: string;
  logisticStatus?: number;
}> = {
  6:      { action: 'none',     label: 'Em aberto' },
  9:      { action: 'paid',     label: 'Atendido/Faturado' },
  12:     { action: 'cancel',   label: 'Cancelado' },
  15:     { action: 'logistic', label: 'Em andamento', logisticStatus: 1 },
  24:     { action: 'logistic', label: 'Verificado', logisticStatus: 2 },
  735162: { action: 'logistic', label: 'Enviado', logisticStatus: 3 },
  458580: { action: 'logistic', label: 'Entregue', logisticStatus: 4 },
  18:     { action: 'none',     label: 'Venda Agenciada' },
  21:     { action: 'none',     label: 'Em digitação' },
  458582: { action: 'none',     label: 'Degustação' },
  466195: { action: 'none',     label: 'Aguardando Cardápio' },
};

export const ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pendente',     color: '#f59e0b' },
  processing: { label: 'Processando', color: '#3b82f6' },
  paid:       { label: 'Pago',        color: '#10b981' },
  shipped:    { label: 'Enviado',     color: '#8b5cf6' },
  delivered:  { label: 'Entregue',    color: '#06b6d4' },
  canceled:   { label: 'Cancelado',   color: '#ef4444' },
  error:      { label: 'Erro',        color: '#dc2626' },
};

// ========== API RESPONSE ==========

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
