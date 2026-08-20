---
title: Acessibilidade
category: Deixe do seu jeito
order: 78
summary: Suporte a leitor de tela e teclado — o que está coberto, e o que ainda não.
keywords: acessibilidade accessibility a11y leitor de tela VoiceOver NVDA navegação por teclado foco aria contraste movimento reduzido
---

# Acessibilidade

O Gitcito quer ser operável sem mouse e legível para um leitor de tela. Esta
página diz o que isso significa em concreto — e onde estão os limites.

## Teclado

- **Abas, linhas da barra lateral, listas de arquivos e menus da barra de
  ferramentas** recebem foco e ativam com Enter ou Space. Botões divididos
  (pull/push/stash) expõem a seta do menu como um controle focável próprio.
- **O grafo de commits** é uma única parada de foco: foque nele e use
  cima/baixo (ou j/k) para percorrer a história. O commit selecionado é
  anunciado com assunto, autor e posição. Shift+F10 (ou a tecla de menu) abre
  o menu de contexto do commit selecionado.
- **Menus de contexto** abrem já com foco: as setas movem, Enter ativa,
  ArrowRight/ArrowLeft entram e saem de submenus, Escape fecha.
- **Diálogos** prendem o Tab dentro de si, devolvem o foco para onde você
  estava quando fecham, e fecham com Escape.
- A **paleta de comandos** (Cmd/Ctrl+K) é uma combobox: os resultados são
  anunciados enquanto você digita e enquanto navega por eles com as setas.

## Leitores de tela

- Todo diálogo é anunciado com seu título. Os toasts — o canal de feedback do
  app — são regiões vivas: sucessos se anunciam com educação, erros
  interrompem.
- O progresso (clone, download de atualização) é exposto como uma barra de
  progresso com porcentagem, e estados ocupados ("Buscando…") se anunciam
  sozinhos.
- O status dos arquivos é falado ("Adicionado", "Modificado", "Em conflito"),
  não só mostrado como um glifo colorido.
- A janela é estruturada com landmarks (banner, main, barra lateral, barra de
  status), então a navegação por landmarks funciona.

## Os limites, ditos sem rodeios

- **O terminal** é xterm.js e herda a história dele com leitores de tela, que
  é fraca. Trate-o como uma superfície para quem enxerga; toda operação git
  que ele oferece também existe como ação da interface.
- **O Cosmos (história em 3D), as faixas do grafo de commits e os diffs de
  imagem** são visuais por natureza. Os dados por trás — a lista de commits,
  as listas de arquivos — são acessíveis; a imagem em si, não.
- **Arrastar e soltar** (reordenar passos do rebase interativo, arrastar
  branches para fazer merge) é só com ponteiro onde indicado; cada ação de
  arrastar tem um equivalente em menu ou botão.
- A auditoria por trás desta página foi feita com o VoiceOver no macOS.
  NVDA/JAWS no Windows devem se comportar do mesmo jeito, mas não foram
  testados na prática — relatos são bem-vindos como
  [issues](https://github.com/MyAppDesk/gitcito/issues).

## Configurações relacionadas

**Movimento reduzido** é respeitado a partir da configuração do sistema — as
animações viram transições instantâneas. O contraste pode ser ajustado tema a
tema em [Configurações → Aparência](themes.md).
