---
title: Avatares de autor
category: Deixe do seu jeito
order: 103
summary: Fotos do Gravatar quando existem, um avatar gerado quando não — e um rosto na barra de título que reage ao repositório.
keywords: avatar avatares gravatar blobatar autor foto imagem identicon rosto offline privacidade e-mail hash humor expressão animação movimento triste irritado contente pensativo assustado incerto doente sonolento desanexado stash adormecido
---

# Avatares de autor

Uma lista de commits é um muro de nomes, e nomes se leem devagar. Uma imagem ao
lado de cada um transforma «quem escreveu isso» em algo que você responde de
relance. O Gitcito coloca uma em cada autor que mostra: na coluna de autor do
grafo, nos detalhes do commit ao lado do autor e de cada coautor, no seletor de
coautores enquanto você escreve, no alternador de perfis e ao lado de cada perfil
nas Configurações.

## De onde vem a imagem

Duas fontes, tentadas nessa ordem:

| Fonte | Quando é usada |
|---|---|
| **Gravatar** | O e-mail do commit tem conta no Gravatar. Buscada por HTTPS, a partir de um hash SHA-256 do e-mail em minúsculas. |
| **Avatar gerado** | Todo o resto — sem Gravatar, sem rede, ou com a busca desligada. Desenhado localmente a partir do e-mail, nunca baixado. |

O avatar gerado é uma criaturinha, não um quadrado colorido: o mesmo e-mail produz
sempre a mesma forma e as mesmas cores, então um autor continua reconhecível entre
repositórios e entre reinícios. Dois e-mails diferentes praticamente nunca colidem.
Ele é desenhado pelo [blobatar](https://github.com/Alain00/blobatar) (MIT) e não
precisa de rede nenhuma — um repositório cheio de autores sem Gravatar ainda recebe
um conjunto completo de rostos distinguíveis, offline, na primeira pintura.

Como a semente é o **e-mail do commit**, um autor que commita com dois endereços
ganha dois avatares. Isso é deliberado — é o mesmo sinal que a coluna de autor do
grafo dá, e é normalmente assim que você percebe uma conta de máquina ou um
`user.email` mal configurado. Corrija com
[atributos de autor](attributes.md) se os dois endereços forem de fato a mesma
pessoa.

## O rosto na barra de título

O avatar ao lado do nome do seu perfil é o único avatar do Gitcito que representa
**você, neste repositório, agora** — então é o único que reage ao estado do
repositório. Ele faz uma cara quando tem algo, e fica neutro o resto do tempo.

![O avatar da barra de título com seu rosto irritado](../../screenshots/avatar-mood.webp)

A que ele reage, do pior para baixo: arquivos deixados em conflito; um merge,
rebase, cherry-pick ou revert que ninguém disse ao git como terminar; um HEAD
desanexado — assustado quando há trabalho não commitado embaixo, apenas em dúvida
quando não há; commits se acumulando sem push, ou sem pull do remoto; alterações
se acumulando sem commit; uma gaveta de stashes que ninguém abre; e um repositório
onde nada chegou há um mês.

O pior vence: um repositório com conflitos *e* quarenta commits sem push usa os
conflitos. Passe o mouse sobre o avatar e a dica diz exatamente o que causou o
rosto — uma imagem que muda sem motivo declarado é um enigma, não um sinal. O que
se lê é a dica; o rosto só faz você olhar.

Os limites são altos de propósito. Um rosto que fica preocupado com um único commit
sem push fica preocupado para sempre, e um sinal permanente é um sinal que se
aprende a não ler. Um branch sem upstream fica neutro em vez de contente:
«sincronizado» não é uma afirmação possível sobre um branch que ninguém enviou.

**Isto é decoração, não instrumentação.** A barra de status carrega as contagens
reais, e é nela que se deve acreditar. O rosto só diz *tem algo aí*, de relance.

### Movimento

O avatar da barra de título respira e pisca por conta própria. Desligue em
**Configurações → Temas → Grafo → Animar o avatar do perfil** — a expressão continua
seguindo o repositório, só para de se mover. O movimento também é dispensado
automaticamente quando o seu sistema pede movimento reduzido.

Só este avatar anima. Um avatar animado precisa ser desenhado como SVG vivo em vez
de imagem em cache, o que é aceitável para um e desperdício para as várias centenas
que um grafo desenha ao rolar.

## Desligar a busca

**Configurações → Temas → Grafo → Mostrar avatares.**

Desligado significa:

- nenhuma requisição a `gravatar.com`, nunca — nem adiada, nem em cache com nova
  tentativa;
- os avatares continuam aparecendo, todos gerados localmente.

Então é um interruptor de privacidade, não um «esconder as imagens». Não existe
configuração que remova os avatares por completo.

## Os limites

- **Uma busca no Gravatar conta ao gravatar.com que aquele e-mail foi consultado.**
  O hash não é segredo: quem tiver um e-mail candidato pode gerar o hash e comparar.
  Se a lista de autores de um repositório é algo que você preferia não entregar a
  terceiros, desligue a busca antes de abri-lo.
- **Só Gravatar.** Avatares que você subiu no GitHub, GitLab ou Bitbucket não são
  lidos — exigiriam uma chamada autenticada à API do host por autor, rede demais
  para um enfeite.
- **Sem substituições.** Você não pode fixar uma imagem escolhida em um autor, nem
  trocar o estilo gerado. O avatar é uma função do e-mail e de nada mais.
- **Uma foto do Gravatar não tem expressão.** Se o e-mail do seu perfil tiver uma, a
  barra de título mostra a foto e nenhum rosto — uma fotografia não faz careta para
  você. Desligue a busca se preferir o blob expressivo.
- **O rosto segue apenas o repositório ativo.** Numa aba que não é um repositório
  não há a que reagir, então ele fica neutro.
- **Uma leitura de cada vez.** O rosto mostra a única coisa pior que encontrou,
  então um repositório pode estar bagunçado de várias formas e ainda usar uma só
  expressão. Não é uma lista de status — isso é trabalho da barra de status e da
  dica.
- **Pequeno é pequeno.** Na coluna de autor do grafo o avatar tem 16px, o que
  carrega cor e silhueta, mas não detalhe. Os detalhes do commit desenham o autor a
  38px, e é aí que o rosto realmente aparece.

**Veja também:** [Temas e aparência](themes.md) · [O grafo de commits](graph.md) ·
[Atributos de autor](attributes.md) · [Perfis](profiles.md)
