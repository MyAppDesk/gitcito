---
title: CI local
category: Sincronização e vários repositórios
order: 58
summary: Rode as GitHub Actions do repo localmente com act — antes de qualquer push.
keywords: ci local local ci act actions workflow runner docker pipeline teste test antes do push nektos veredito selo notas por commit verdict badge notes per-commit
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

## Vereditos por commit no grafo

![Vereditos do Local-CI no grafo](../../screenshots/local-ci-verdicts.webp)

Uma execução concluída fixa seu resultado no commit que testou: um pequeno
frasco marca a linha em **verde ou vermelho** no grafo, para que você veja de
relance quais commits já sobreviveram à CI localmente. O veredito é guardado
como uma nota do git em `refs/notes/gitcito-ci` — local à sua máquina, nunca
enviado por push por padrão.

Regra de honestidade: o veredito só é fixado quando a sua árvore de trabalho
estava **limpa**. Uma execução sobre mudanças não commitadas testou algo que
nenhum commit contém, então ela mostra o resultado no diálogo, mas não marca
nada.

## Testar um commit ou intervalo — sem sair do seu branch

A seção **Testar um commit ou intervalo** do diálogo roda um workflow contra
commits em que você *não* está. Cada commit passa por checkout **detached em
um worktree descartável** no diretório temporário do sistema, o act roda ali,
e o worktree é removido seja qual for o fim da execução — a sua árvore de
trabalho e o seu branch nunca se movem. Como esse checkout é imaculado por
construção, o veredito sempre é fixado no commit testado. Clicar com o botão
direito em um commit no grafo oferece diretamente **Executar CI local neste
commit**.

O custo é anunciado antes de qualquer coisa rodar, não descoberto depois:
digite uma revisão ou um intervalo (`main..HEAD`, `HEAD~5..`, um sha),
pressione **Prévia**, e o Gitcito mostra quantos commits a especificação
abrange e quais N mais recentes — o orçamento explícito, limitado a 50 — de
fato rodariam. Uma varredura os executa **sequencialmente** (act mais Docker
pesa o bastante para execuções paralelas brigarem pela máquina), transmite o
log de cada execução, marca cada commit como passou/falhou em tempo real, e
**Parar** aborta entre commits, encerrando o que estiver em andamento. Espere
minutos de verdade por commit.

Mais um limite que vale conhecer: o worktree descartável contém os arquivos do
commit, mas não os checkouts de submódulos do seu repositório — um workflow
que dependa de submódulos inicializados vai se comportar como em um clone
recém-feito sem eles.

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
