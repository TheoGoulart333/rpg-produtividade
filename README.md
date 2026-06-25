# Gamified Task Manager

> Gerenciador de tarefas com sistema de XP e níveis progressivos, desenvolvido para demonstrar manipulação de estado, persistência no front-end e separação de responsabilidades — sem frameworks externos.

![screenshot]<img width="1466" height="494" alt="rpg-tela-1" src="https://github.com/user-attachments/assets/41065ffc-46a0-4adc-b23d-6a37660bd433" />



## Funcionalidades

- **Sistema de XP e níveis**: cada tarefa concluída concede XP (10 / 25 / 50 pontos por dificuldade). Ao atingir marcos, o usuário avança de nível — de Iniciante a Imortal (8 níveis).

- **Persistência**: tarefas, pontuação e nível são preservados entre recarregamentos via `localStorage`.

- **Filtros**: visualização por todas as tarefas, pendentes ou concluídas.

- **Validação**: tarefas com texto vazio ou muito curto são rejeitadas com feedback visual.

- **Acessibilidade**: atributos ARIA, `aria-live`, `role="progressbar"` e navegação por teclado.

## Decisões Técnicas

### Arquitetura em 3 camadas

O código é organizado explicitamente em três responsabilidades:

| Camada | Arquivo | Responsabilidade |
|--------|---------|-----------------|
| **Domain** | `app.js` — seção `DOMAIN` | Lógica pura de gamificação (sem efeitos colaterais) |
| **State** | `app.js` — seção `STATE` | Mutação e persistência do estado da aplicação |
| **UI** | `app.js` — seção `UI` | Renderização e captura de eventos do DOM |

O fluxo de dados é estritamente unidirecional:

```
ação do usuário → mutação do estado → saveState() → render()
```

Esse padrão reflete o princípio central de frameworks como React/Redux e demonstra compreensão de **por que** eles existem.

### Persistência com `localStorage`

**Por que é adequado aqui:**

- App single-user e single-device sem necessidade de backend
- Dados não-sensíveis (nomes de tarefas)
- Funciona offline nativamente
- Zero custo de infraestrutura

**Limitações conhecidas e conscientes:**

| Limitação | Impacto no projeto | Mitigação futura |
|-----------|-------------------|-----------------|
| ~5 MB de cota por origin | Irrelevante para texto | — |
| Síncrono/bloqueante | Imperceptível para payloads pequenos | `IndexedDB` para dados maiores |
| Exposto a XSS | Aceitável (dados não-sensíveis) | Sanitização de input + CSP |
| Sem sincronização multi-device | Limitação de escopo | Backend + JWT |
| Sem TTL nativo | Sem problema para este caso | Lógica de expiração manual |

### Lógica de gamificação isolada

A função `getLevelInfo(totalXP)` é **pura**: recebe um número e devolve dados, sem tocar em DOM ou estado global. Isso a torna testável unitariamente em isolamento:

```js

// Testável sem nenhum mock de DOM ou localStorage
console.assert(getLevelInfo(0).current.name === 'Iniciante');
console.assert(getLevelInfo(50).current.name === 'Aprendiz');
console.assert(getLevelInfo(1500).levelIndex === 7);
```

### Prevenção de XSS

Todo texto inserido pelo usuário é escapado antes de ser injetado no DOM via `escapeHtml()`, prevenindo ataques de Cross-Site Scripting.

## Como rodar

Nenhuma dependência ou build step necessário. Basta abrir o arquivo:

```bash

# Opção 1 — abrir direto no browser

open index.html

# Opção 2 — servidor local (recomendado)

npx serve .

# ou

python3 -m http.server 3000
```

## Estrutura de arquivos

```
gamified-task-manager/
├── index.html   # Estrutura semântica e acessível
├── style.css    # Design system com variáveis CSS; tema escuro
├── app.js       # Lógica em 3 camadas (Domain / State / UI)
└── README.md
```

## Melhorias futuras

- [ ] Testes unitários na camada Domain com Vitest
- [ ] Migração para React + Context API (sem alterar a lógica de domínio)
- [ ] Categorias e tags para as tarefas
- [ ] Backend com autenticação para sincronização multi-device
- [ ] Gráfico de produtividade semanal

## Autor

Desenvolvido como projeto de portfólio para demonstrar domínio de lógica de dados e persistência no front-end.
