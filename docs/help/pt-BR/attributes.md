---
title: Atributos de arquivo
category: Ferramentas de workspace
order: 96
summary: .gitattributes com uma interface — finais de linha, binários, changelogs com merge por união, export-ignore, e diffs legíveis para Word e PDF.
keywords: gitattributes atributos attributes driver de diff textconv merge union binary export-ignore eol crlf lf text auto filter clean smudge lfs linguist check-attr
---

# Atributos de arquivo

O `.gitattributes` é o arquivo de maior valor no git que quase ninguém escreve. É
como um repositório **ensina o git sobre o próprio conteúdo**: quais arquivos são
binários, quais devem concatenar em vez de conflitar, quais nunca saem num arquivo
compactado, que finais de linha todo mundo recebe.

A parte importante: ele é commitado. Uma regra que você adiciona conserta o problema
para todo mundo que clonar, em todo sistema operacional, para sempre — diferente de
uma configuração no seu config pessoal, que conserta para você e deixa seus colegas
descobrirem do jeito difícil.

`⌘K` → **Atributos de arquivo**.

![As regras que um repositório já carrega, os presets, o verificador de caminho e os drivers de diff](../../screenshots/attributes.webp)

## O que as regras fazem

| Atributo | Conserta |
|-----------|-------|
| `text=auto eol=lf` | Finais de linha que viram do avesso dependendo de quem fez checkout do arquivo |
| `binary` | O git tentando dar diff ou merge de três vias num PSD, num DOCX, num asset compilado |
| `merge=union` | Um changelog em que todo mundo acrescenta linhas, e em que todo mundo conflita |
| `-merge` | Arquivos em que um merge de três vias produz besteira — lockfiles, código gerado |
| `export-ignore` | Configuração de CI e fixtures embarcados num tarball de release |
| `diff=<driver>` | Diffs ilegíveis para formatos que *são* legíveis, dado um conversor |
| `filter=lfs` | Arquivos grandes guardados via [LFS](lfs-sparse.md) |
| `linguist-vendored` | Código vendorizado contado como seu nas estatísticas de linguagem |

`binary` é abreviação de `-diff -merge -text`, que são três respostas para "pare de
adivinhar sobre este arquivo" numa palavra só.

## Editando

Os presets preenchem um padrão e os atributos dele; edite o padrão antes de
adicionar — `CHANGELOG.md` é uma sugestão, não uma regra sobre o seu projeto.

**As edições são cirúrgicas.** Adicionar uma regra para um padrão que já tem uma
reescreve aquela linha onde ela está, em vez de acrescentar uma segunda regra que
ganha por ser mais recente. Os comentários do arquivo sobrevivem intocados, porque o
"porquê" ao lado de uma regra costuma valer mais que a regra.

Todo salvamento é uma ação normal do Gitcito: mostra um toast, e **Desfazer**
restaura o arquivo exatamente como ele estava.

**Um repositório pode ter vários arquivos de atributos.** Um na raiz, um em qualquer
subdiretório, e um `.git/info/attributes` privado, que nunca é commitado e vale só na
sua máquina — o lugar certo para uma regra que é sobre você, não sobre o projeto. O
Gitcito lista todos e diz qual é qual.

## O que se aplica a um caminho?

As regras vêm de vários arquivos, a mais específica ganha, e lê-las para chegar à
resposta é adivinhação. **O que se aplica a um caminho?** roda o `git check-attr` e
mostra o que o próprio git conclui — a única resposta que conta.

## Drivers de diff: deixando um documento do Word legível

Um `.docx` é um zip. Um `.pdf` é um grafo de objetos comprimido. O git dá diff neles
como o que eles são — ruído — então o histórico de um documento é ilegível mesmo que
o documento não seja.

Um **driver de diff** conserta isso com o `textconv`: um comando que transforma o
arquivo em texto *só para efeito de diff*. O arquivo na sua árvore de trabalho fica
intocado; o git só compara o texto convertido.

Duas metades, e as duas são necessárias:

1. `diff.<name>.textconv` no git config — o comando conversor.
2. `*.docx diff=<name>` no `.gitattributes` — a quais arquivos ele se aplica.

Os botões aqui fazem as duas de uma vez. O Gitcito **não distribui nenhum desses
conversores** e não finge o contrário: ele verifica o seu PATH e oferece só o que
está de fato instalado, deixando o resto acinzentado com o binário de que precisaria.

| Driver | Precisa de | Te dá |
|--------|-------|-----------|
| `word` | `pandoc` | Diffs de prosa em `.docx` |
| `pdf` | `pdftotext` (poppler) | Diffs de texto em `.pdf` |
| `excel` | `xlsx2csv` | Diffs por linha de planilhas |
| `exif` | `exiftool` | O que mudou numa imagem, quando os pixels são opacos |
| `json` | `jq` | Diffs de JSON estáveis, com chaves ordenadas |

A metade do conversor mora no **seu** config, não no repositório — o git não vai
rodar comandos que um clone te entrega, o que é uma propriedade de segurança que
vale manter. Então um colega que clonar recebe a regra `diff=word` e, até instalar o
pandoc, o velho diff ilegível. Diga isso no seu README.

## Limites que vale conhecer

- **Filtros clean/smudge não são oferecidos aqui.** Regras `filter=<name>` podem ser
  escritas na mão, mas o Gitcito não vai configurar os comandos: um filtro roda em
  todo checkout de todo arquivo que casar, e um filtro errado corrompe silenciosamente
  a sua árvore de trabalho.
- **`text=auto` muda o que é commitado**, normalizando os finais de linha na entrada.
  Num repositório existente, adicione-o e então rode `git add --renormalize .`
  deliberadamente, num commit só dele.
- **Atributos não se aplicam retroativamente.** Marcar um arquivo como `binary` hoje
  não muda como os diffs passados dele foram guardados; muda como o git o trata daqui
  em diante.
- **As regras só valem onde o arquivo é visível.** Uma regra em
  `design/.gitattributes` não diz nada sobre `src/`.
- O Gitcito escreve arquivos inteiros, então um arquivo formatado à mão volta com a
  formatação dele — mas uma regra que o Gitcito reescreve é reformatada para o
  espaçamento canônico do git, `pattern attr attr`.

Veja também: [LFS e sparse checkout](lfs-sparse.md) ·
[Bundles e arquivos](export.md) · [Opções de merge](merge-options.md) ·
[Hooks](hooks.md)
