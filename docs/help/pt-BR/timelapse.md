---
title: Timelapse
category: Repositório e histórico
order: 14
summary: Reproduza a vida inteira do repositório como uma animação, e exporte.
keywords: timelapse vídeo animação histórico replay gource exportar webm filme retrospectiva do ano
---

# Timelapse

Assista ao repositório crescer.

Cada arquivo é um ponto, posicionado pela pasta de primeiro nível: nasce quando é
adicionado, pulsa quando um commit o toca, incha conforme é editado de novo e de
novo, e some quando é apagado. A data, o autor, o assunto e as contagens correntes
de commits/arquivos/autores ficam por cima, com uma barra de progresso embaixo.

![O timelapse no meio da reprodução](../../screenshots/timelapse.webp)

![A vida inteira de um repositório, reproduzida](../../screenshots/clip-timelapse.webp)

## Controles

- **Play / pause**, velocidades de **4× a 32×**, e reiniciar.
- O controle deslizante busca **reproduzindo desde o início**, então voltar cai
  exatamente no mundo certo, e não numa aproximação dele.

## Exportar vídeo

**Exportar vídeo** grava o canvas de ponta a ponta e pergunta onde salvar um
`.webm`.

A gravação acontece na própria página (`MediaRecorder`) — não há encoder para
instalar, não há ffmpeg, e nada é enviado para lugar nenhum. Nada é escrito no
disco até você escolher um caminho.

> Um repositório com forma de verdade dá um filme melhor do que um arrumadinho.
> Renomeações, remoções e uma pasta que de repente explode são o que fazem valer a
> pena assistir.

**Veja também:** [Máquina do tempo](time-machine.md) · [Insights](insights.md)
