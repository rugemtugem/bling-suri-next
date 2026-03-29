# AGENT.md — Bling × Suri Next

Este é o ponto de entrada para assistentes IA.

## Workflow Operacional

1. Leia `.context/index.toml` primeiro
2. Carregue `always.files` antes de qualquer análise
3. Identifique a intenção do usuário e carregue a seção `on_*` correspondente
4. Leia apenas arquivos listados em `read`
5. Edite apenas arquivos listados em `write`

## Sempre Ler Primeiro
- `.context/project.toml`
- `.context/rules.md`
- `.context/soul.md`

## Após concluir uma tarefa
- Atualize `.context/memory/progress.md`
- Se encontrou bugs, registre em `.context/memory/issues.md`
- Se tomou decisão arquitetural, adicione em `.context/memory/decisions.md`
