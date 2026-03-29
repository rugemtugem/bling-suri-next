# Spec: Sincronização de Produtos

**Fluxo:** Bling → Servidor → Suri

## Endpoint
`POST /api/sync/products`

## Comportamento
1. Busca todos produtos alterados nos últimos 7 dias (Bling API v3 paginada)
2. Para cada produto, mapeia campos Bling → formato Suri
3. Verifica no banco se produto existe (by SKU)
4. Se existe → PUT (atualizar). Se não → POST (criar)
5. Se update retorna 404 → produto foi deletado da Suri, recria com POST
6. Salva/atualiza registro no banco (Product model)
7. Registra resultado no SyncLog

## Mapeamento de campos
| Bling | Suri |
|-------|------|
| `codigo` | `sku`, `id` |
| `descricao` | `name` |
| `descricaoComplementar` | `description` |
| `preco` | `price` |
| `imagens[].link` | `images[].url` |
| `pesoLiquido` × 1000 | `weightInGrams` |

## Critérios de aceitação
- [ ] Todos os produtos são sincronizados sem duplicatas
- [ ] Erros individuais não interrompem o sync total
- [ ] Resultado retorna contadores (created, updated, errors, skipped)
- [ ] Cada operação é registrada no SyncLog
