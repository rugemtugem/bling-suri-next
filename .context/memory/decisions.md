# Decisions

## ADR-001: Migração PHP → Next.js (2026-03-29)

**Contexto:** Sistema PHP com estado em arquivos JSON, sem retry, sem dashboard real-time.
**Decisão:** Migrar para Next.js + Prisma + SQLite com dashboard React.
**Consequência:** Maior confiabilidade, rastreabilidade total, UI profissional.

## ADR-002: SQLite para MVP (2026-03-29)

**Contexto:** Precisamos de banco de dados para substituir JSON files.
**Decisão:** SQLite via Prisma (arquivo local, zero config).
**Consequência:** Fácil de migrar para PostgreSQL depois via `prisma migrate`.

## ADR-003: Autenticação com JWT + bcrypt (2026-03-29)

**Contexto:** Dashboard precisa de login. Único usuário admin.
**Decisão:** JWT em cookie httpOnly, senha com bcrypt, cadastro no primeiro acesso.
**Consequência:** Segurança adequada para painel administrativo single-user.
