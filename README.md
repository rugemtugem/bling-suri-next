# ⚡ Bling × Suri — Painel de Integração

Dashboard profissional para sincronização entre **Bling ERP** e **Suri Atendimento**, construído com Next.js, TypeScript e Prisma.

![Stack](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite)

---

## 🎯 O que faz

Integra os três fluxos de negócio entre Bling e Suri com rastreabilidade total:

| Fluxo | Direção | Descrição |
|-------|---------|-----------|
| **Produtos** | Bling → Suri | Sincroniza catálogo de produtos com mapeamento de campos |
| **Pedidos** | Suri → Bling | Recebe vendas via webhook e cria pedidos automaticamente |
| **Status** | Bling ↔ Suri | Propaga mudanças de status (pago, enviado, entregue, cancelado) |

---

## ✨ Funcionalidades

### Dashboard
- 📊 **Métricas em tempo real** — pedidos do dia, produtos sincronizados, taxa de sucesso
- 🛒 **Tabela de pedidos** — busca, filtros por status, paginação
- 🔄 **Painel de sync manual** — botões para disparar sincronização sob demanda
- 📡 **Feed de atividades** — timeline com todas as operações (auto-refresh 30s)
- 🔑 **Status do token** — indicador visual com contagem de horas restantes

### Backend
- 🔐 **Autenticação JWT** — login com bcrypt, cookie httpOnly, cadastro no primeiro acesso
- 🔄 **OAuth2 Bling** — handshake automático com renovação de token
- 📦 **Sync de produtos** — paginação, upsert, tratamento de erros individuais
- 🛒 **Webhook de pedidos** — idempotente, com retry e fallback de contato
- 📊 **Sync de status** — mapeamento completo dos 11 status do Bling
- ⏱️ **Rate limiting** — 350ms entre chamadas Bling, 500ms entre chamadas Suri
- 📝 **Logs estruturados** — toda operação registrada no banco (SyncLog + StatusLog)

### Infraestrutura
- 🐳 **Docker ready** — Dockerfile multi-stage otimizado para Dokploy
- 🗄️ **Prisma + SQLite** — zero config, fácil migrar para PostgreSQL
- 📁 **DotContext** — contexto estruturado para assistentes IA
- 🌐 **basePath** — configurado para subfolder (`/bling-suri-next`)

---

## 🗂️ Hierarquia do Projeto

```
bling-suri-next/
│
├── 📁 .context/                        # DotContext — Governança IA
│   ├── index.toml                      #   Roteador: o que carregar por tarefa
│   ├── project.toml                    #   Stack, URLs, design tokens
│   ├── rules.md                        #   Padrões técnicos inegociáveis
│   ├── soul.md                         #   Comportamento do assistente IA
│   ├── .contextignore                  #   Arquivos ignorados pela IA
│   ├── 📁 memory/
│   │   ├── progress.md                 #   Estado atual do projeto
│   │   ├── issues.md                   #   Bugs e contornos conhecidos
│   │   └── decisions.md                #   Registros de decisão (ADR)
│   ├── 📁 specs/
│   │   ├── sync-products.md            #   Spec: sincronização de produtos
│   │   ├── process-orders.md           #   Spec: processamento de pedidos
│   │   └── sync-status.md              #   Spec: sincronização de status
│   └── 📁 skills/
│       └── deployment.md               #   Guia de deploy VPS/Dokploy
│
├── 📁 prisma/
│   └── schema.prisma                   # 6 modelos: Token, Product, Order,
│                                       #   StatusLog, SyncLog, User
│
├── 📁 src/
│   ├── 📁 app/                         # Next.js App Router
│   │   ├── globals.css                 #   Design system completo (dark theme,
│   │   │                               #   glassmorphism, 480+ linhas)
│   │   ├── layout.tsx                  #   Root layout (pt-BR, Inter font)
│   │   ├── page.tsx                    #   Dashboard + Login (React client)
│   │   ├── favicon.png                 #   Ícone da aba
│   │   │
│   │   └── 📁 api/                     # API Routes
│   │       ├── 📁 webhooks/
│   │       │   └── suri/route.ts       #   POST — Recebe eventos da Suri
│   │       │                           #     OrdersCreated → cria pedido Bling
│   │       │                           #     OrdersPaid → marca pago
│   │       │                           #     OrdersCanceled → cancela
│   │       ├── 📁 sync/
│   │       │   ├── products/route.ts   #   POST — Sync Bling→Suri (produtos)
│   │       │   └── status/route.ts     #   POST — Sync Bling↔Suri (status)
│   │       ├── 📁 auth/
│   │       │   ├── bling/route.ts      #   GET — OAuth2 callback do Bling
│   │       │   └── login/route.ts      #   POST — Login/cadastro JWT
│   │       ├── orders/route.ts         #   GET — Lista pedidos (filtros, busca)
│   │       ├── dashboard/route.ts      #   GET — Métricas e atividades
│   │       └── 📁 cron/
│   │           └── refresh/route.ts    #   GET — Renovação automática de token
│   │
│   ├── 📁 lib/                         # Lógica compartilhada
│   │   ├── bling-client.ts             #   Cliente Bling API v3 (tipado,
│   │   │                               #     rate limit, cache de SKU)
│   │   ├── suri-client.ts              #   Cliente Suri API (tipado,
│   │   │                               #     produtos, pedidos, logística)
│   │   ├── token-manager.ts            #   Gerenciamento OAuth2 (auto-refresh,
│   │   │                               #     persistência no banco)
│   │   ├── prisma.ts                   #   Singleton Prisma (adapter LibSQL)
│   │   └── types.ts                    #   Interfaces TS completas
│   │                                   #     (Bling, Suri, mapas de status)
│   │
│   └── 📁 generated/prisma/           # Cliente Prisma gerado (auto)
│
├── Dockerfile                          # Multi-stage build para Dokploy
├── .dockerignore                       # Exclusões do build Docker
├── AGENT.md                            # Ponto de entrada para IA
├── next.config.ts                      # basePath + standalone
├── prisma.config.ts                    # Datasource URL (Prisma 7)
├── .env                                # Credenciais (não versionado)
├── package.json                        # Dependências
└── tsconfig.json                       # TypeScript config
```

---

## 🚀 Setup Local

```bash
# 1. Instalar dependências
npm install

# 2. Gerar Prisma client
npx prisma generate

# 3. Criar banco de dados
npx prisma db push

# 4. Iniciar em desenvolvimento
npm run dev
```

Acesse: `http://localhost:3000/bling-suri-next`

### Primeiro Acesso
- **Email:** `contato@rugemtugem.dev`
- **Senha:** cadastrada no primeiro login

---

## 🐳 Deploy (Dokploy)

1. Push para GitHub
2. No Dokploy → Nova Application → Dockerfile
3. Configurar variáveis de ambiente:

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | `file:./data/prod.db` |
| `BLING_CLIENT_ID` | Client ID OAuth2 Bling |
| `BLING_CLIENT_SECRET` | Client Secret Bling |
| `BLING_API_URL` | `https://www.bling.com.br/Api/v3` |
| `BLING_REDIRECT_URI` | URL do callback OAuth2 |
| `SURI_API_URL` | URL da API Suri |
| `SURI_API_TOKEN` | Token Bearer da Suri |
| `SURI_CATEGORY_ID` | ID da categoria de produtos |
| `JWT_SECRET` | Chave secreta para tokens JWT |
| `ADMIN_EMAIL` | Email do administrador |

4. Configurar domínio → `rugemtugem.dev/bling-suri-next`

---

## ⏱️ Crons Recomendados

```bash
# Renovar token Bling (a cada 4 horas)
0 */4 * * * curl -s https://rugemtugem.dev/bling-suri-next/api/cron/refresh

# Sincronizar status (a cada 5 minutos)
*/5 * * * * curl -s -X POST https://rugemtugem.dev/bling-suri-next/api/sync/status
```

---

## 📡 Endpoints da API

| Rota | Método | Origem | Função |
|------|--------|--------|--------|
| `/api/webhooks/suri` | POST | Suri | Recebe eventos de pedidos |
| `/api/sync/products` | POST | Manual/Cron | Sincroniza catálogo |
| `/api/sync/status` | POST | Manual/Cron | Sincroniza status |
| `/api/auth/bling` | GET | Browser | OAuth2 Bling |
| `/api/auth/login` | POST | Dashboard | Login/cadastro |
| `/api/orders` | GET | Dashboard | Lista pedidos |
| `/api/dashboard` | GET | Dashboard | Métricas |
| `/api/cron/refresh` | GET | Cron | Renova token |

---

## 🛡️ Segurança

- Credenciais em variáveis de ambiente (nunca hardcoded)
- Senhas com **bcrypt** (custo 12)
- Sessão via **JWT** em cookie httpOnly
- Token Bling renovado automaticamente antes de expirar

---

## 📝 Licença

Projeto privado — Baby Suri / rugemtugem.dev
