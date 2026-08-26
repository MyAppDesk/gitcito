---
title: Flutter DevTools
category: Ferramentas do workspace
order: 93
summary: A visão de rede, a timeline, o inspetor e o profiler de memória, numa aba do Gitcito.
keywords: devtools flutter dart rede network timeline inspetor memória profiler webview painel embutido vm service
---

# Flutter DevTools

O DevTools já tem a visão de rede, a timeline, o inspetor de widgets e o profiler
de memória — e é um app Flutter web servido na sua própria máquina. Então o
Gitcito não reimplementa nada disso, nem fala ele mesmo com o Dart VM Service:
percebe o endereço e embute.

![DevTools aberto numa aba do Gitcito](../../screenshots/devtools.webp)

O `flutter run` imprime a linha assim que o VM service sobe:

```
The Flutter DevTools debugger and profiler on iPhone 16 Pro is available at:
http://127.0.0.1:9100?uri=http://127.0.0.1:53412/uJ8k=/
```

A sessão de launch vigia a própria saída atrás dela, e a barra de depuração ganha
um botão. Ao clicar, o DevTools abre **dentro da aba do repositório**: a aba
ganha um ícone pequeno, clicar nele alterna entre o repositório e a ferramenta, e
o ✕ que aparece ao passar o mouse fecha. Um ícone por sessão — dois apps rodando
ao mesmo tempo são dois DevTools.

Um **hot restart publica um endereço novo**, e a aba acompanha enquanto a sessão
viver. Quando a sessão acaba, a aba guarda o último endereço, que normalmente já
está morto: feche e abra o DevTools a partir da nova execução.

## Quais ferramentas

Uma ferramenta entra aqui se fizer duas coisas: servir uma interface web nesta
máquina e imprimir o endereço dela.

| Ferramenta | A linha que ela imprime |
|---|---|
| Flutter DevTools | `The Flutter DevTools … is available at: <url>` |
| Dart DevTools (`dart devtools`) | `Serving DevTools at <url>` |
| Vue DevTools (`@vue/devtools`) | `Vue Devtools … listening on <url>` |
| Prisma Studio | `Prisma Studio is up on <url>` |
| Drizzle Studio | `Drizzle Studio is up and running on <url>` |
| webpack-bundle-analyzer | `Webpack Bundle Analyzer is started at <url>` |
| qualquer outra que cite DevTools e um endereço | cai numa correspondência genérica |

**O que não dá para embutir, e por quê.** O inspector do Node imprime um endpoint
`ws://` para um depurador se plugar, não uma página — e o front do Chrome DevTools
que o acompanha mora atrás de uma URL `devtools://` que nenhuma visão embutida
pode carregar. O build standalone do React DevTools é a própria janela de desktop,
não uma página servida. Nenhum dos dois pode ser uma aba aqui; ambos precisariam
de um cliente de protocolo de depuração, não de um endereço.

**Dev server não é dev tool.** O Vite na `:5173` é o seu app, e embuti-lo seria um
painel de preview — outra feature, deliberadamente não esta.

## O que ele pode fazer

A visão embutida anda na coleira curta, porque este app guarda credenciais:

- **Só loopback.** `127.0.0.1`, `localhost`, `::1`. Anexar qualquer outro
  endereço é recusado, e um redirecionamento para lá também.
- **Sem preload, sem node integration, com isolamento de contexto.** A página não
  tem ponte nenhuma para dentro do Gitcito.
- **Links abrem no seu navegador de verdade**, numa janela normal, não no painel.

## Os limites

- **É o DevTools, não algo nosso.** O que aquela versão faz, o painel faz; o que
  ela não faz, nós também não. Não existe visão de rede com cara de Gitcito.
- **Só o Flutter se anuncia assim.** Um programa Dart comum imprime uma URL do VM
  service, mas nenhum endereço de DevTools — então nenhum botão aparece.
- **Painel em branco quer dizer que o app parou.** O DevTools é servido *pelo app
  em execução*; quando ele sai, o endereço para de responder.

**Veja também:** [Executar e depurar](launch.md)
