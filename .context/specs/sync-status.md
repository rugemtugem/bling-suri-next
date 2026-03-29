# Spec: Sincronização de Status

**Fluxo:** Bidirecional (Bling ↔ Suri)

## Endpoint
`POST /api/sync/status`

## Comportamento (Bling → Suri)
1. Busca últimos 50 pedidos não finalizados do banco
2. Para cada um, consulta status atual na Bling (`GET /pedidos/vendas/{id}`)
3. Compara com último status conhecido no banco
4. Se mudou, executa ação correspondente na Suri:
   - Situação 9 → `POST /orders/paid`
   - Situação 12 → `POST /orders/cancel`
   - Situação 15/24/735162/458580 → `POST /orders/logistic` (status 1-4)
5. Atualiza Order.status e Order.blingStatus
6. Registra mudança no StatusLog

## Mapa de Status
| Bling ID | Label | Ação Suri | Status Logístico |
|:--------:|-------|-----------|:----------------:|
| 6 | Em aberto | Nenhuma | — |
| 9 | Atendido | paid | — |
| 12 | Cancelado | cancel | — |
| 15 | Em andamento | logistic | 1 |
| 24 | Verificado | logistic | 2 |
| 735162 | Enviado | logistic | 3 |
| 458580 | Entregue | logistic | 4 |

## Critérios de aceitação
- [ ] Apenas pedidos com status alterado são atualizados
- [ ] Rate limiting de 200ms entre chamadas
- [ ] Toda mudança de status registrada no StatusLog
- [ ] Pedidos cancelados/entregues são ignorados em ciclos futuros
