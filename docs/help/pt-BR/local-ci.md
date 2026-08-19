---
title: CI local
category: Sincronização e vários repositórios
order: 58
summary: Rode as GitHub Actions do repo localmente com act — antes de qualquer push.
keywords: ci local local ci act actions workflow runner docker pipeline teste test antes do push nektos
---

# CI local

O ciclo push–espera–xis vermelho–correção–push desperdiça dez minutos por
rodada. Com [act](https://nektosact.com), os mesmos workflows rodam em
contêineres Docker na sua máquina, e o Gitcito os comanda: escolha um workflow,
pressione Executar e veja o mesmo log que a CI imprimiria — antes de qualquer
coisa sair da sua máquina.

![CI local](../../screenshots/local-ci.webp)

## Uma integração, não um runtime embutido

O Gitcito deliberadamente **não** embute act nem Docker — um app que carrega
um runtime de contêiner junto é o oposto de um cliente git. É uma integração
opt-in: ative em **Configurações → Integrações** (ou no próprio diálogo), e o
Gitcito detecta o que está instalado e guia você pelo resto —
`brew install act`, um daemon do Docker rodando, pronto. Nada roda até que as
três condições sejam verdadeiras: ativada, act instalado, Docker acessível.

## O que ele faz

- Lista cada workflow em `.github/workflows`, pelo seu `name:`.
- **Executar** roda o workflow com act contra a sua **árvore de trabalho** —
  incluindo as mudanças não commitadas, que é exatamente o ponto: testar antes
  de commitar, não depois do push.
- A saída chega ao diálogo em tempo real; **Parar** encerra a execução. Saída
  0 mostra **Passou**; qualquer outra, **Falhou** com o código.

## Limites

- act é uma imitação muito boa dos runners do GitHub, não uma perfeita:
  actions que precisam de serviços hospedados pelo GitHub, secrets ou imagens
  de runner exóticas podem se comportar de forma diferente. Um verde local é
  evidência forte, não garantia.
- Uma execução por vez por repositório; iniciar outra cancela a primeira.
- Apenas execuções no nível do workflow — escolher jobs individuais, matrizes
  ou eventos é território do act; rode-o no [terminal](terminal.md) quando
  precisar de flags.
- A primeira execução baixa as imagens dos runners — espere que seja lenta uma
  vez.

**Veja também:** [Hosting e pull requests](hosting.md) · [Terminal integrado](terminal.md)
