---
title: Compartilhamento seguro
category: Segurança
order: 72
summary: Leve segredos, notas ou um workspace inteiro entre máquinas — ou colegas — como um único arquivo criptografado.
keywords: compartilhamento seguro secure share exportar export importar import bundle criptografado encrypted workspace transferir máquina equipe notas estrutura sem backend
---

# Compartilhamento seguro

Configurar uma máquina nova — ou um colega novo — normalmente significa
redigitar tudo. O compartilhamento seguro empacota isso num único arquivo
`.gitcito` criptografado: os recursos de equipe do Gitcito **não têm backend**,
então o arquivo *é* o transporte. Envie-o do jeito que você já envia arquivos; a
senha viaja separadamente.

![Exportando as configurações de um repositório como um bundle criptografado](../../screenshots/secure-share.webp)

![A mesma exportação para um workspace inteiro](../../screenshots/secure-workspace.webp)

## O que pode entrar

| Seção | Conteúdo |
|---|---|
| **Cofre** | Os segredos do cofre global (entradas do cofre por repositório ficam onde estão) |
| **Arquivos do repositório** | Arquivos de configuração e segredos não rastreados, re-materializados nos mesmos caminhos relativos na importação |
| **Estrutura do workspace** | O próprio layout de abas — grupos, cores, ordem — com repositórios referenciados pela URL do remote, nunca pelos seus caminhos locais |
| **Notas de commit** | A `refs/notes/commits` de um repositório, aplicada na importação sem precisar de acesso de escrita a nenhum remote |

Segredos só são incluídos quando você **marca a caixa**. Um bundle sem essa
marca não contém credencial nenhuma. As configurações do app não viajam num
bundle — elas têm sua própria exportação em JSON simples nas Configurações.

## Importando

A tela de importação mostra o que há dentro **antes** de aplicar qualquer coisa,
seção por seção, e os repositórios são casados com o que você já tem — primeiro
pela URL do remote, depois pela pasta — para que importar não clone o mundo de
novo.

Uma seção de **estrutura do workspace** recria o workspace com os repositórios
que você já tem; os que você não tem são listados com o remote deles, para que
você possa cloná-los primeiro e importar de novo — o Gitcito nunca clona por
você aqui. Uma seção de **notas de commit** mostra uma prévia do que chegaria —
novas, idênticas, divergentes ou presas a commits que você não tem — e notas
divergentes só são substituídas quando você marca **sobrescrever**; não há merge
de notas divergentes.

**Veja também:** [Cofre](vault.md) · [Segurança e segredos](security.md) ·
[Notas de commit](notes.md) · [Workspaces, abas e grupos](workspaces.md)
