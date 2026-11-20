---
title: Terminal integrado
category: Ferramentas de workspace
order: 90
summary: Um PTY de verdade acoplado embaixo do repo, com abas por repositório.
keywords: terminal shell pty xterm console abas tabs acoplado autocompletar npm run scripts make makefile composer branch checkout
---

# Terminal integrado

Um PTY de verdade (xterm + node-pty), não um executador de comandos. Seu shell, seu
prompt, seus aliases.

![O terminal integrado](../../screenshots/terminal.webp)

- **Várias abas por repositório**, cada uma começando na pasta daquele repositório.
- Acople-o **embaixo** do grafo ou como uma **coluna à direita**; o painel lembra o
  tamanho dele.
- A visibilidade do terminal é por repositório: mudar para uma aba que nunca abriu
  um terminal o mantém fechado.
- As abas se nomeiam conforme o que está rodando nelas.
- Colapsar a lista de terminais a encolhe num **trilho**: um ícone por terminal
  (terminais divididos mostram um mini mapa de painéis), clique para trocar, botão
  direito para o menu de sempre com renomear/dividir/matar.
- **Arraste um terminal sobre outro** na lista para fundi-los em um grupo
  dividido. Cada terminal mantém seu nome como painel; o grupo resultante
  recebe um novo nome numerado.

![Dois painéis divididos lado a lado num mesmo grupo de terminal](../../screenshots/terminal-split.webp)

## Teclas

| Teclas | Faz |
|---|---|
| <kbd>⌃`</kbd> | Mostra ou esconde o terminal — a tecla Control física, em todas as plataformas |
| <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> | Novo terminal, enquanto o terminal tem o foco |
| <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> | Fecha o terminal em foco; fechar o último esconde o painel |
| <kbd>Ctrl+Shift+C</kbd> | Copia a seleção; um <kbd>Ctrl+C</kbd> sozinho também copia enquanto há seleção, e continua sendo SIGINT quando não há |
| <kbd>Ctrl+V</kbd> / <kbd>Ctrl+Shift+V</kbd> / <kbd>Shift+Ins</kbd> | Cola da área de transferência |
| Clique direito | Copia a seleção, ou cola quando nada está selecionado |

As duas primeiras valem só no terminal, de propósito: fora dele, continuam
abrindo e fechando [abas de workspace](workspaces.md). No macOS, Copiar/Colar do
menu Editar funcionam do mesmo jeito.

## Sugestão de scripts

Digite `npm run ` (ou `pnpm`, `yarn`, `bun run`) e uma lista com os scripts do
projeto aparece no cursor, filtrada enquanto você digita: `npm run loc` acha o
`LOCAL_SERVER`. Cada nome mostra o comando que ele roda.

| Tecla | Faz |
|-------|-----|
| **Tab** | Completa o script selecionado |
| **↑ / ↓** | Escolhe outro |
| **Esc** | Fecha a lista até você digitar de novo |

Outros comandos ganham a própria lista:

| Digitado | Lista | Lido de |
|----------|-------|---------|
| `composer run ` | Scripts do Composer | o `composer.json` mais próximo |
| `make ` | Alvos do Makefile, com o `## texto` depois do alvo como descrição | o `Makefile` da pasta atual, como o `make` lê |
| `git checkout `, `switch`, `merge`, `rebase` | Branches locais, depois as remotas pelo nome curto | o repositório em que o shell está |

Um alvo de Makefile montado com variáveis ou padrão (`%.o`) não aparece, e
`git checkout -b` não ganha lista: ele dá nome a uma branch nova.

Os scripts vêm do `package.json` mais próximo da pasta **atual** do shell, então
depois de `cd frontend` aparecem os do frontend. Nomes que começam com o que você
digitou vêm primeiro, depois os que o contêm.

A lista só conhece as teclas digitadas desde o último Enter. Trazer um comando
com ↑, mover o cursor ou usar o Tab do próprio shell muda a linha sem ela ver,
então ela fica quieta até o próximo Enter em vez de completar errado. No Windows
não dá para ler a pasta atual, então a lista segue a pasta em que o terminal
abriu.

## O seu PATH

O shell sobe como **shell de login**, igual ao Terminal.app ou ao iTerm, então
`~/.zprofile`, `~/.zlogin` e `~/.bash_profile` são executados. Isso importa
porque gerenciadores de versão e o `brew shellenv` costumam se instalar ali —
uma ferramenta como `fvm`, `nvm` ou `pyenv` que funciona no seu terminal
funciona aqui também.

O Gitcito também pergunta ao seu shell de login qual é o `PATH` real na
inicialização e o mescla em tudo o que dispara, porque um app gráfico aberto
pelo Dock não herda quase nada. Se um comando continuar não sendo encontrado,
confira se ele está no `PATH` de um shell de login, e não só no de um
interativo.

Qualquer coisa que você rode aqui é invisível para o travamento interno do Gitcito,
então um `git rebase` longo digitado à mão e um clique na interface ainda podem
colidir — o app se atualiza a partir do disco quando o terminal muda alguma coisa.

## Shell, tema e Oh My Posh

No Windows, Configurações → Layout escolhe o shell que cada terminal novo abre —
PowerShell, PowerShell Core (`pwsh`), `cmd`, Git Bash, WSL ou um executável
próprio. O visual do terminal (tema, tamanho e família da fonte) fica em
Configurações → Temas → Tema do terminal e vale na hora para todas as sessões.

Se o [Oh My Posh](https://ohmyposh.dev) estiver instalado, a seção de tema do
terminal também lista todo `*.omp.json` em `%POSH_THEMES_PATH%`, com prévia ao
vivo — escolher um o injeta como `POSH_THEME` nos terminais novos, então um
simples `oh-my-posh init pwsh` no seu profile já o usa. Um caminho próprio de
`.omp.json` também funciona; deixar o campo em Padrão mantém o que o seu
shell/profile ou o `POSH_THEME` global já definem. Sessões abertas mantêm o tema
com que foram criadas — feche e reabra um terminal para aplicar o novo. Os
glifos do prompt precisam de uma Nerd Font na família de fonte do terminal (por
exemplo `CaskaydiaMono Nerd Font`), senão os ícones aparecem como quadradinhos.

Sobre velocidade: o Oh My Posh roda o binário dele uma vez por prompt — por
volta de 100–200 ms no Windows, mais em temas com segmento de git num repositório
grande — e isso aparece como uma pausa curta antes de cada prompt, não como
lentidão do Gitcito. Temas sem segmento de git são os mais rápidos. O estilo de
previsão do PowerShell também pesa: `-PredictionViewStyle InlineView` repinta uma
área pequena a cada tecla, enquanto `ListView` redesenha um bloco inteiro.

**Veja também:** [Rodar e depurar](launch.md) · [Hooks](hooks.md)
