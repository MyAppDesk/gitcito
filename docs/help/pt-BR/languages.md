---
title: Idiomas e da direita para a esquerda
category: Deixe do seu jeito
order: 102
summary: Escolha o idioma da interface por bandeira e endônimo, com layout espelhado para árabe e hebraico.
keywords: idioma idiomas language languages locale locales i18n internacionalização tradução traduzir rtl direita para esquerda right-to-left árabe hebraico espelhar direção bandeira endônimo inglês espanhol alemão francês português italiano holandês polonês turco russo ucraniano chinês japonês coreano
---

# Idiomas e da direita para a esquerda

A interface do Gitcito é traduzida. O idioma é uma
configuração do Gitcito, não do sistema operacional — um desenvolvedor num macOS em
inglês que prefere ler japonês define isso aqui, e um desenvolvedor num sistema em
hebraico que prefere o app em inglês não é passado por cima.

**Configurações → Geral → Idioma.**

![O seletor de idioma](../../screenshots/languages.webp)

## O que vem junto

| | | | |
|---|---|---|---|
| English | Español | Deutsch | Français |
| Português (Brasil) | Italiano | Nederlands | Polski |
| Türkçe | Русский | Українська | 简体中文 |
| 日本語 | 한국어 | العربية | עברית |

Cada linha do seletor é escrita no próprio idioma dela. Quem procura coreano está
varrendo a tela atrás de 한국어, não da palavra "coreano" num idioma do qual está
tentando sair.

### Sobre as bandeiras

Uma bandeira nomeia um país; um locale nomeia um idioma. Os dois genuinamente não se
alinham — o árabe é língua oficial em mais de vinte estados, e o português está em
dois continentes. Os ícones seguem a mesma convenção que o seletor de locale de
qualquer sistema operacional usa: a região principal do locale. Eles estão ali para
serem *reconhecidos de relance*, não para fazer uma afirmação sobre a quem um idioma
pertence.

Eles são desenhados como arte vetorial em vez de emoji de propósito. O Windows não
traz emoji de bandeira nenhum — `🇩🇪` renderiza lá como uma caixinha contendo as
letras "DE".

## Da direita para a esquerda

O árabe e o hebraico espelham a interface inteira: a barra lateral vai para a
direita, painéis e barras de ferramentas invertem, ícones que apontam para algum
lugar apontam para o outro lado.

A troca é imediata e não precisa reiniciar.

![O Gitcito em árabe, com o layout espelhado](../../screenshots/rtl.webp)

### O que deliberadamente não é espelhado

Parte do conteúdo é da esquerda para a direita, não importa em que idioma você leia.
Espelhá-lo seria ativamente errado, então estes ficam como estão:

| Continua LTR | Por quê |
|-----------|-----|
| O grafo de commits | As posições das faixas são calculadas em pixels; um contêiner espelhado discordaria das linhas desenhadas |
| Diffs e conteúdo de arquivos | Código é LTR, e um diff espelhado é ilegível |
| Blame e a saída do resolvedor de conflitos | Mesmo motivo — o texto é código-fonte, não prosa |
| O terminal integrado | Ele renderiza a própria grade; a saída do git é LTR |
| Caminhos, SHAs, refs e comandos | `refs/heads/main` se lê numa direção só |

Cada um desses é isolado para que um trecho em árabe *dentro* de um deles — um nome
de branch, uma mensagem de commit, um nome de arquivo — não consiga reordenar o texto
em volta.

### Os limites

Isto é honesto sobre onde para:

- **Mensagens de commit, nomes de branch e conteúdo de arquivos nunca são
  redirecionados pelo Gitcito.** Eles são mostrados como o autor os escreveu. Uma
  mensagem de commit em hebraico numa lista isolada como LTR renderiza como hebraico,
  mas a linha em volta não vira para acomodá-la.
- **Superfícies de terceiros mantêm a própria direção** — o terminal é o xterm, e as
  pré-visualizações de Markdown renderizam o documento como ele foi escrito.
- **Nomes de arquivo com direção mista são difíceis.** Um caminho com uma pasta em
  árabe dentro de uma árvore em inglês é isolado em vez de reordenado, o que está
  correto mas ainda pode surpreender na primeira vez.

## Este manual também é traduzido

Não são só os botões. Cada página que você está lendo existe em todos os idiomas que a
lista acima mostra — as explicações, as tabelas do que cada opção faz, as seções que
dizem o que um recurso se recusa a fazer. Trocar o idioma da interface troca o manual junto, tanto no app quanto
no site.

Uma tradução pode estar incompleta. Se uma página ainda não foi traduzida, você recebe a
inglesa em vez de uma página faltando, e a barra lateral mantém o mesmo formato em todos
os idiomas, então uma captura de tela ou uma instrução continua batendo com o que você
vê.

No site, cada página traz um seletor de idioma que mantém você na página que estava
lendo, porque trocar de idioma não é a mesma coisa que começar do zero.

**O que é traduzido por máquina, e o que isso custa.** O inglês e o espanhol foram
escritos à mão. O resto foi traduzido por um modelo com base num glossário e depois
conferido por script: cada página, cada link, cada caminho de imagem, cada bloco de
código byte a byte contra o inglês. Isso pega estrutura quebrada. Não pega uma frase que
está correta mas dura. Se uma página lê mal no seu idioma, isso é um bug que vale a pena
reportar.

## Adicionando um idioma

Os dicionários são um arquivo por locale dentro de `src/renderer/src/i18n/`, e o
arquivo em inglês é a referência contra a qual todos os outros são checados por
tipos — uma chave faltando é um erro de compilação, não um fallback silencioso para o
inglês. A suíte de testes também verifica se todo `{placeholder}` que uma string
interpola sobrevive à tradução, para que uma frase não perca o sha do commit no
caminho para outro idioma.

O manual funciona do mesmo jeito: `docs/help/` guarda as páginas em inglês e
`docs/help/<locale>/` guarda cada tradução, um arquivo por página com o mesmo nome. O
`npm run lint:docs` verifica se toda página traduzida tem um original em inglês, se o
front matter dela está completo e se os links e as imagens dela resolvem a partir de um
diretório mais fundo.

Contribuições são bem-vindas — uma página por vez já ajuda, e consertar uma tradução
desajeitada é tão útil quanto adicionar uma que está faltando.

**Veja também:** [Temas e aparência](themes.md) · [Perfis](profiles.md)
