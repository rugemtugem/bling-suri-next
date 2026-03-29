# Spec: Processamento de Pedidos

**Fluxo:** Suri → Servidor → Bling

## Endpoint
`POST /api/webhooks/suri`

## Payload de entrada
```json
{ "OrderId": "string", "HookEvent": "OrdersCreated | OrdersPaid | OrdersCanceled" }
```

## Comportamento — OrdersCreated
1. Verifica se pedido já foi processado (banco Order by suriOrderId)
2. Busca detalhes completos na API Suri (`GET /orders/{id}`)
3. Cria ou busca contato na Bling (by CPF → by nome → cria novo)
4. Para cada item, busca ID do produto na Bling (by SKU)
5. Monta estrutura do pedido de venda Bling
6. Envia para Bling (`POST /pedidos/vendas`)
7. Salva mapeamento no banco (Order model)

## Comportamento — OrdersPaid / OrdersCanceled
1. Busca mapeamento Suri→Bling no banco
2. Atualiza status na Bling via PATCH
3. Registra mudança no StatusLog

## Critérios de aceitação
- [ ] Pedidos duplicados são ignorados (idempotência)
- [ ] Contatos existentes são reutilizados
- [ ] Erros são persistidos no banco (Order.lastError)
- [ ] Toda operação é rastreável via StatusLog e SyncLog
