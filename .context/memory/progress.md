# Progress

## MVP v0.1 — Estado Atual

### ✅ Concluído
- [x] Scaffolding Next.js 16 + TypeScript
- [x] Prisma schema com 6 modelos (Token, Product, Order, StatusLog, SyncLog, User)
- [x] Design system CSS completo (dark theme, glassmorphism, animações)
- [x] Clientes tipados Bling e Suri com rate limiting
- [x] Token manager com auto-renovação
- [x] API Routes: webhooks/suri, sync/products, sync/status, auth/bling, auth/login, orders, cron/refresh, dashboard
- [x] Dashboard React com login, métricas, tabela de pedidos, sync panel, activity feed
- [x] Autenticação JWT com bcrypt
- [x] DotContext completo (.context/)
- [x] basePath configurado para VPS subfolder

### 🔲 Próximos
- [ ] Testes end-to-end com dados reais
- [ ] Deploy VPS com PM2/Nginx
- [ ] Seed do banco com dados do PHP
- [ ] Middleware de autenticação obrigatória
