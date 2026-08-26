---
title: Regras do repositório (.gitcito.json)
category: Ferramentas de workspace
order: 98
summary: As regras da casa que viajam com o repositório — branches protegidos, escopos de commit, o que um clone precisa e uma lista antes do push.
keywords: gitcito.json configuração do repositório regras doctor requisitos branches protegidos escopos scopes trailers ticket links do rastreador checklist onboarding hooksPath node submódulos lfs env example
---

# Regras do repositório (`.gitcito.json`)

Todo projeto carrega regras que ninguém deduz lendo o código. *Nunca faça push
direto para `release/*`.* *Os escopos de commit são `api`, `web` e `infra`, e
mais nenhum.* *Você precisa de Node 20, dos submódulos inicializados e de um
`.env` copiado do `.env.example` antes que qualquer coisa rode.* Essas regras
moram num README que ninguém relê, numa falha de CI ou na cabeça de quem está
aqui há mais tempo.

`.gitcito.json` é onde o repositório as escreve para que a ferramenta possa agir
sobre elas. Ele fica na raiz do repositório, é versionado como qualquer outro
arquivo e por isso viaja com o clone: quem abre o projeto recebe as mesmas
regras, e quem chegou agora as recebe no primeiro dia, não no primeiro push
recusado.

O arquivo é totalmente opcional. Um repositório sem ele se comporta exatamente
como sempre.

Você não precisa escrevê-lo à mão: o [chat do repositório](repo-chat.md) recebe
o esquema deste arquivo, então *adicione links de tickets para JIRA-1234* ou
*proteja os branches de release* volta como uma ação de arquivo revisável.

![A aba Config do repositório, com as linhas do doctor e as seções de regras](../../screenshots/repo-config.webp)

## Onde editar

A engrenagem ao lado das ferramentas da barra → **Config**. Esse editor escreve
o arquivo na sua árvore de trabalho; ele não é salvo em nenhum outro lugar,
então **faça commit** para compartilhar as regras com o time.

Se o repositório não tem nenhum, **Ler o repositório** propõe um a partir do que
já existe: um `.nvmrc` ou `engines.node`, um `.gitmodules`, `filter=lfs` no
`.gitattributes`, um `.env.example` sem `.env` ao lado, os branches que você já
protege localmente e os escopos que os últimos 500 assuntos de commit vêm
usando. Nada é escrito até você salvar. No terminal, `gitcito config init` faz o
mesmo (veja [a linha de comando](cli.md)).

## O que o arquivo pode dizer

```json
{
  "version": 1,
  "protect": ["main", "release/*"],
  "links": {
    "tickets": [
      { "match": "\\b[A-Z][A-Z0-9]+-\\d+\\b", "url": "https://tracker.example.com/browse/$0", "label": "Jira" }
    ]
  },
  "commit": {
    "scopes": ["api", "web", "infra"],
    "ticketFromBranch": true,
    "trailers": ["Refs: {ticket}"]
  },
  "requires": {
    "node": ">=20",
    "hooksPath": ".husky",
    "submodules": true,
    "lfs": true,
    "files": [{ "path": ".env", "from": ".env.example", "why": "URL base da API e um token de desenvolvimento" }]
  },
  "checklist": {
    "push": ["Rodar a suíte de integração contra o staging"]
  }
}
```

| Campo | O que faz |
|---|---|
| `version` | Precisa ser `1`. Um arquivo de um esquema mais novo é ignorado por inteiro, em vez de adivinhado. |
| `protect` | Nomes de branch, com `*` casando qualquer texto. São **somados** aos branches que você protege localmente — veja [branches protegidos](repo-settings.md). |
| `links.tickets` | Uma expressão regular e um modelo de URL. `$0` é a correspondência inteira, `$1`…`$9` seus grupos. Correspondências em assuntos e corpos de commit viram links. |
| `commit.scopes` | Os escopos que o compositor oferece, em vez de um campo livre. Declará-los também transforma um escopo desconhecido de conselho de estilo em erro no `gitcito commit-check`. |
| `commit.ticketFromBranch` | Preenche a chave do ticket a partir do nome do branch (`feature/ABC-123-coisa` → `ABC-123`) — mas só num compositor vazio, nunca por cima do que você está digitando. |
| `commit.trailers` | Linhas anexadas ao corpo do commit. `{ticket}` e `{branch}` são preenchidos; uma linha cujo marcador não tem o que preencher é descartada em vez de escrita pela metade. |
| `requires.*` | O que um clone funcional precisa. Cada entrada vira uma linha do doctor, abaixo. |
| `checklist.push` | Texto livre mostrado uma vez por sessão, antes do primeiro push. |

## O doctor

`requires` é a parte que responde a *"clonei e não roda"*. O Gitcito verifica ao
abrir o repositório e mostra um chip de estetoscópio na barra de status quando
algo está fora do lugar. Clicar no chip abre a aba Config nas linhas do doctor;
**Verificar de novo** roda tudo outra vez.

| Verificação | Passa quando | Conserta com |
|---|---|---|
| `node` | O `node` do seu PATH satisfaz a especificação | — |
| `submodules` | Nenhum submódulo está sem checkout | `git submodule update --init --recursive` |
| `lfs` | git-lfs está instalado e os arquivos rastreados são conteúdo real, não texto de ponteiro | `git lfs pull` |
| `hooksPath` | `core.hooksPath` bate com o caminho declarado | definir `core.hooksPath` |
| `files` | O arquivo existe | copiá-lo de `from`, se existir |

Dois limites deliberados. Um **aviso** nunca significa "quebrado" — significa que
o doctor não conseguiu determinar algo (uma especificação de Node ilegível passa
em vez de inventar uma falha sobre a qual você não pode agir), e avisos não
reprovam o `gitcito doctor` na CI. E um reparo nunca é algo que o arquivo
forneceu: o conjunto acima é o conjunto inteiro, fechado em tempo de compilação.
A configuração entrega um valor — um caminho para copiar, um valor para
`core.hooksPath` — e nunca um comando.

Copiar um arquivo nunca sobrescreve: o arquivo estar ausente é exatamente o
motivo de aquela linha existir.

## Commits

Com `commit.scopes` declarados, o botão de escopo do compositor oferece aquela
lista em vez de um campo livre — a diferença entre `feat(renderer)` e
`feat(rendererr)`. `ticketFromBranch` e `trailers` preenchem as partes mecânicas
de uma mensagem, e `links.tickets` devolve as chaves como links onde quer que um
commit seja exibido.

As mesmas regras valem fora da janela: `gitcito commit-check` lê este arquivo,
então um hook `commit-msg` e a CI cobram exatamente o que o compositor sugere.
Veja [a linha de comando](cli.md) e [commits](committing.md).

## A lista antes do push

`checklist.push` aparece como uma confirmação antes do primeiro push da sessão,
uma linha por item. É o lugar para o que é de fato um julgamento humano — *alguém
avisou o suporte?* — porque o Gitcito **nunca verifica isso por você**. São
lembretes, não travas: leia e faça push, ou cancele. Mostrado uma vez por
repositório por sessão, porque um diálogo em todo push é um diálogo que ninguém
lê.

## Por que ele não pode te machucar

O arquivo chega com o repositório, ou seja, chega de quem escreveu o
repositório. Ele é tratado como conteúdo não confiável, igual a uma mensagem de
commit:

- **Nada nele executa.** Não existe campo que carregue um comando, e os reparos
  do doctor são uma lista fixa.
- **Ele só pode adicionar restrições.** `protect` é união com a sua lista local —
  um repositório pode proteger mais do que você escolheu, nunca convencer você a
  desproteger algo. Nenhum campo desliga uma proteção.
- **Caminhos não podem sair do repositório.** Caminhos absolutos, `..`, `~`,
  letras de unidade e qualquer coisa que toque `.git` são rejeitados, e
  verificados de novo no ponto em que a string vira um caminho real.
- **Links precisam ser `http(s)`.** Nada além disso é entregue ao abridor de URL
  do sistema.
- **Tudo tem limite** — tamanho de listas, de strings, de padrões — para que um
  repositório hostil não consiga colar um muro de texto num diálogo nem mil chips
  num painel.

Um campo ruim é descartado, não fatal. O resto do arquivo continua valendo, e o
que foi descartado aparece em **Ignorado pelo Gitcito** na aba Config, com o
motivo. A única exceção é JSON inválido ou uma `version` desconhecida, onde não
há o que salvar.

## O que ele deliberadamente não faz

- **Sem comandos, sem scripts, sem hooks.** É para isso que existem os
  [hooks](hooks.md), e eles são uma decisão sua por clone.
- **Sem regras por branch ou por pessoa.** Um arquivo, um conjunto de regras.
- **Não substitui a CI.** A lista é texto; o doctor verifica o ambiente, não o
  seu trabalho.
- **Não consegue enfraquecer nada.** Toda proteção do Gitcito continua sendo sua.

**Veja também:** [Configurações por repositório](repo-settings.md) ·
[A linha de comando](cli.md) · [Commits](committing.md) ·
[Hooks e .gitignore](hooks.md)
