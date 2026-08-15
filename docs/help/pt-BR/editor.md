---
title: Editor externo
category: Ferramentas de workspace
order: 95
summary: Mande um repositório, um arquivo ou uma linha de código para o editor em que você realmente escreve.
keywords: editor vscode code cursor windsurf zed sublime jetbrains intellij webstorm xcode abrir no editor linha coluna comando personalizado argv
---

# Editor externo

Um cliente Git é onde você lê código; raramente é onde você o conserta. A
distância entre notar um problema num diff e ter o cursor naquela linha no seu
editor é uma busca de arquivo e uma rolagem — toda vez.

Aponte o Gitcito para o seu editor uma vez e essa distância some: clique com o
botão direito numa linha na visão de arquivo ou de blame e ela abre lá, naquela
linha.

## Escolhendo um

**Configurações → Geral → Editor externo.** O dropdown lista os editores que o
Gitcito consegue encontrar nesta máquina — ele procura primeiro pelo comando de cada
editor e depois, no macOS, pelo bundle da aplicação em `/Applications` e
`~/Applications`. A varredura roda toda vez que você abre as Configurações, então um
editor instalado cinco minutos atrás aparece sem precisar reiniciar.

Reconhecidos de fábrica:

| Editor | Comando que ele procura |
|--------|----------------------|
| Visual Studio Code | `code`, `code-insiders` |
| Cursor | `cursor` |
| Windsurf | `windsurf` |
| Zed | `zed` |
| Sublime Text | `subl` |
| IDEs da JetBrains | `idea`, `webstorm`, `pycharm`, `rustrover`, `goland`, `clion`, `rider`, `phpstorm` |
| Xcode | `xed` |

## O limite que vale conhecer

**Pular para uma linha precisa do comando do editor, não do ícone dele.** Um bundle
`.app` do macOS é lançado através do `open`, que aceita um caminho e mais nada — então
um editor encontrado só como bundle abre o arquivo no topo, e o Gitcito diz isso
embaixo do dropdown em vez de fingir o contrário.

O conserto é do lado do editor: o *Shell Command: Install 'code' command in PATH* do
VS Code, o symlink `subl` do Sublime, o *Toolbox → Settings → Shell scripts* da
JetBrains. Assim que o comando existir, escolha o editor de novo e o pulo para a
linha funciona.

## Onde as ações aparecem

| Superfície | O que ela abre |
|---------|---------------|
| Aba do repo, repo na barra lateral, barra de status | A pasta do repositório |
| Árvore de arquivos, arquivos de commit, arquivos de stash, compositor de commit | Aquele arquivo |
| O ícone no fim da linha na árvore de arquivos | Aquele arquivo, em um clique |
| Botão direito numa linha na visão de **arquivo** | O arquivo, naquela linha |
| Botão direito numa linha na visão de **blame** | O arquivo, naquela linha |

As ações de linha só aparecem onde o número da linha ainda significa alguma coisa:
um arquivo mostrado num commit antigo, ou um blame rebobinado para uma revisão
anterior, tem linhas que não correspondem mais ao que está em disco, então o Gitcito
não oferece pulo ali em vez de te mandar para o lugar errado.

## Um comando seu

Escolha **Comando personalizado** para qualquer coisa fora da tabela — um script
wrapper, um lançador de desenvolvimento remoto, um editor de terminal iniciado pelo
seu próprio shim.

| Campo | Significado |
|-------|---------|
| Comando | O executável a rodar. Sem shell, então nada de `&&`, pipes ou globs. |
| Nome | Como as entradas de menu vão chamá-lo. |
| Argumentos para um arquivo | Template de argv, ex.: `-g {path}:{line}:{col}` |
| Argumentos para uma pasta | Template de argv, normalmente só `{path}` |

Os templates são divididos em espaços e cada token é substituído uma vez — um
caminho com espaço continua sendo um argumento só, e nada é re-parseado depois,
então um nome de arquivo nunca pode virar sintaxe. Quatro marcadores: `{path}`,
`{line}`, `{col}`, `{repo}`.

Um marcador sem valor leva a flag dele junto: `--line {line} {path}` rodado sem
linha vira apenas o caminho, nunca um `--line` solto que engoliria o nome do arquivo
como argumento. Um template sem `{line}` simplesmente significa que o Gitcito não vai
oferecer ações precisas por linha para aquele editor.

## O que isto não é

Isto não é a configuração de ["Abrir com" um app](repo-settings.md), que mostra o
seletor do sistema e lembra um app para abrir *qualquer coisa* — uma imagem, um PDF,
uma pasta no Finder. O editor é o mais específico dos dois, então onde os dois estão
configurados o editor ganha no ícone de fim de linha da árvore de arquivos; os dois
continuam listados no menu de botão direito.

O Gitcito nunca lança o seu editor sozinho, e fechar o Gitcito nunca o fecha: o
editor é iniciado destacado, como um processo próprio.
