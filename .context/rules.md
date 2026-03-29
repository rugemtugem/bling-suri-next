# Rules

Padrões inegociáveis para este projeto. Sobrescrevem o conhecimento geral da IA.

## Code

- TypeScript strict mode — jamais usar `any` sem justificativa documentada
- Código auto-explicativo; comentários explicam o "porquê", nunca o "quê"
- DRY rigoroso — extrair lógica compartilhada em funções reutilizáveis
- Toda função deve tratar erros explicitamente — sem falhas silenciosas
- Preferir soluções nativas antes de dependências externas

## Architecture

- Next.js App Router com API Routes (não Pages Router)
- Prisma como única camada de acesso ao banco (não raw SQL)
- Clientes de API separados por serviço (`bling-client.ts`, `suri-client.ts`)
- Token management centralizado em `token-manager.ts`
- Todos os dados persistidos no banco — nunca em arquivos JSON

## Naming

- Variáveis/funções: camelCase
- Tipos/interfaces: PascalCase
- Arquivos: kebab-case
- Constantes: UPPER_SNAKE_CASE
- Rotas API: /api/[recurso]/[ação]

## Error Handling

- Nunca expor detalhes internos em mensagens de erro para o usuário
- Logar erros com contexto: timestamp, origem, input que causou
- Validar todos os inputs externos nas fronteiras do sistema
- Usar `SyncLog` para registrar toda operação (sucesso ou erro)

## Security

- Credenciais exclusivamente em variáveis de ambiente (.env)
- Autenticação via JWT em cookie httpOnly
- Senhas com bcrypt (custo 12)
- Tokens Bling persistidos no banco com renovação automática

## Directory Structure

```
src/
├── app/                 # Next.js App Router
│   ├── api/             # API endpoints
│   │   ├── auth/        # Autenticação (login, bling OAuth)
│   │   ├── webhooks/    # Webhooks (Suri)
│   │   ├── sync/        # Sincronização (products, status)
│   │   ├── orders/      # CRUD pedidos
│   │   ├── dashboard/   # Dados do dashboard
│   │   └── cron/        # Jobs agendados
│   ├── globals.css      # Design system
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Dashboard + Login
├── lib/                 # Lógica compartilhada
│   ├── bling-client.ts  # Cliente Bling API
│   ├── suri-client.ts   # Cliente Suri API
│   ├── token-manager.ts # Gerenciamento de token
│   ├── prisma.ts        # Singleton Prisma
│   └── types.ts         # Interfaces TypeScript
└── prisma/
    └── schema.prisma    # Schema do banco
```

## Versioning

- Semantic Versioning: MAJOR.MINOR.PATCH
- Commits descritivos: `type(scope): description`
- Types: feat, fix, refactor, docs, test, chore
