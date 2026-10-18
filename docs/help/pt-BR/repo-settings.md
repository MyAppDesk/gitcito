---
title: Configurações por repositório
category: Ferramentas de workspace
order: 94
summary: Branches protegidas, informações, analytics, histórico e o log de operações.
keywords: configurações do repo repo settings branches protegidas protected branches analytics log de operações operation log histórico informações engrenagem imagem da aba tab image ícone logo
---

# Configurações por repositório

A engrenagem ao lado das ferramentas da barra abre as configurações que pertencem a
**este** repositório, não ao app.

![Configurações por repositório](../../screenshots/repo-settings.webp)

| Aba | O que contém |
|---|---|
| **Geral** | Branches protegidas (uma seleção múltipla de branches, guardada no git config), assinatura, a imagem da aba |
| **Config** | As [regras que este repositório carrega](repo-config.md) em `.gitcito.json`, e o doctor que as verifica |
| **Informações** | Notas e campos livres sobre este repositório, mantidos localmente |
| **Cofre** | As entradas do [cofre](vault.md) deste repositório |
| **Insights** | O [painel de histórico](insights.md) |
| **Analytics** | O que você fez neste repositório, contado localmente |
| **Histórico** · **Logs** | O log de operações: todo comando git que o Gitcito rodou, com a saída dele |

O log de operações é o honesto: quando algo se comporta de forma estranha, ele
mostra o comando exato e o erro exato, para que um relato de bug possa carregar
fatos em vez de adjetivos.

## Imagem da aba

Com dez abas abertas, nomes que começam igual — `api`, `api-gateway`,
`api-docs` — são difíceis de distinguir. Uma imagem pequena na aba se encontra
mais rápido que um texto.

Em **Geral**, clique no campo da imagem. Ele lista as imagens do próprio
repositório — PNG, JPEG, GIF, WebP, SVG, ICO, BMP e AVIF —, cada uma com sua
miniatura, primeiro os arquivos com nome de logo ou ícone. Digite para filtrar
(`logo dark` encontra `assets/logo-dark.png`), navegue com as setas e
pressione Enter para escolher; ou digite um caminho à mão. O caminho é salvo
**relativo à raiz do repositório**, então a imagem acompanha o repositório onde
quer que a pasta dele esteja.

O que a aba mostra é uma escolha do app inteiro, em **Configurações → Geral →
As abas de repositório mostram**:

| Opção | A aba mostra |
|---|---|
| **Imagem e nome** (padrão) | A imagem no lugar do ícone de pasta, depois o nome |
| **Só o nome** | O ícone de pasta e o nome, como se não houvesse imagem |
| **Só a imagem** | Apenas a imagem; o nome vai para o tooltip |

Limites que vale conhecer:

- A lista traz os arquivos que o git enxerga — versionados e não versionados,
  não os ignorados — e no máximo 40 por vez; digite para chegar ao resto. Uma
  imagem ignorada ainda pode ser digitada à mão.
- Imagens acima de 1 MB, ou ilegíveis, aparecem esmaecidas e não podem ser
  escolhidas: um ícone de 20 pixels não precisa de mais.
- Um repositório **sem** imagem sempre mostra o nome, seja qual for a opção:
  uma aba vazia seria impossível de identificar.
- Se o caminho estiver **quebrado** — arquivo apagado, renomeado, não é imagem
  ou é grande demais —, a aba volta discretamente ao nome, e esta aba de
  configurações mostra um aviso abaixo do caminho. Nada mais reclama.
- A imagem é lida uma vez por sessão. Se você substituir o arquivo com o mesmo
  nome, abra esta aba de configurações de novo para recarregá-la.
- A configuração fica nas configurações do Gitcito nesta máquina, não no
  repositório, então os colegas não a herdam.

**Veja também:** [Segurança e segredos](security.md) · [Insights](insights.md)
