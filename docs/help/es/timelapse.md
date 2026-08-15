---
title: Timelapse
category: Repositorio e historial
order: 14
summary: Reproduce la vida entera del repositorio como una animación, y expórtala.
keywords: timelapse video animacion historial reproducir replay gource exportar export webm pelicula resumen del año year in review
---

# Timelapse

Mira crecer el repositorio.

Cada archivo es un punto, colocado según su carpeta de primer nivel: nace cuando
se añade, palpita cuando un commit lo toca, engorda a medida que se edita una y
otra vez, y se desvanece cuando se borra. Encima van la fecha, la autoría, el
asunto y los contadores acumulados de commits, archivos y autores, con una barra
de progreso abajo.

![El timelapse a mitad de reproducción](../../screenshots/timelapse.webp)

![La vida entera de un repositorio, reproducida](../../screenshots/clip-timelapse.webp)

## Controles

- **Reproducir / pausar**, velocidades de **4× a 32×**, y reiniciar.
- El deslizador busca **reproduciendo desde el principio**, así que retroceder
  aterriza exactamente en el mundo correcto y no en una aproximación.

## Exportar vídeo

**Exportar vídeo** graba el lienzo de principio a fin y pregunta dónde guardar un
`.webm`.

La grabación ocurre en la propia página (`MediaRecorder`) — no hay codificador
que instalar, no hay ffmpeg, y no se sube nada a ningún sitio. No se escribe nada
en disco hasta que eliges una ruta.

> Un repositorio con forma de verdad da mejor película que uno ordenado. Los
> renombrados, los borrados y una carpeta que de pronto explota son lo que hace
> que merezca la pena verlo.

**Ver también:** [Máquina del tiempo](time-machine.md) · [Métricas](insights.md)
