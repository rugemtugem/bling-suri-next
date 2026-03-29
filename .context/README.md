# Context Folder — Bling × Suri Next

Contexto operacional para assistentes IA neste projeto.

**Para humanos:** este arquivo explica governança, permissões e estrutura.
**Para a IA:** leia `index.toml` primeiro — ele dita o que carregar em cada situação.

## Estrutura

```
.context/
├── README.md          ← Este arquivo
├── index.toml         ← Roteador IA: o que ler/escrever por tarefa
├── project.toml       ← Identidade, stack, URLs, design tokens
├── rules.md           ← Padrões técnicos inegociáveis
├── soul.md            ← Comportamento e restrições da IA
├── .contextignore     ← Arquivos que a IA não deve ler
├── memory/
│   ├── progress.md    ← O que foi construído e estado atual
│   ├── issues.md      ← Bugs, contornos, áreas frágeis
│   └── decisions.md   ← Registros de decisões arquiteturais
├── specs/
│   ├── sync-products.md
│   ├── process-orders.md
│   └── sync-status.md
└── skills/
    └── deployment.md
```

## Permissões

| Arquivo | Leitura | Escrita IA |
|---------|:-------:|:----------:|
| `index.toml` | ✅ | ❌ |
| `project.toml` | ✅ | ❌ |
| `rules.md` | ✅ | ❌ |
| `soul.md` | ✅ | ❌ |
| `memory/progress.md` | ✅ | ✅ |
| `memory/issues.md` | ✅ | ✅ |
| `memory/decisions.md` | ✅ | ✅ Append only |
| `specs/*.md` | ✅ | ✅ |
| `skills/*.md` | ✅ | ❌ |
