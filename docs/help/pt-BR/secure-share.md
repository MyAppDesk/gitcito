---
title: Compartilhamento seguro
category: Segurança
order: 72
summary: Leve configurações, entradas do cofre ou um workspace inteiro de uma máquina para outra.
keywords: compartilhamento seguro secure share exportar importar bundle criptografado configurações workspace transferir máquina
---

# Compartilhamento seguro

Configurar uma máquina nova normalmente significa redigitar tudo. O
compartilhamento seguro empacota isso num único bundle criptografado.

![Exportando as configurações de um repositório como um bundle criptografado](../../screenshots/secure-share.webp)

![A mesma exportação para um workspace inteiro](../../screenshots/secure-workspace.webp)

## O que pode entrar

| Seção | Conteúdo |
|---|---|
| **Configurações** | Temas, layout, atalhos, preferências |
| **Cofre** | Segredos globais e por repositório |
| **Repositórios** | Os repositórios de um workspace, casados por remote ou pasta na importação |

Segredos só são incluídos quando você **marca a caixa**. Um bundle sem essa marca
não contém credencial nenhuma.

## Importando

A tela de importação mostra o que há dentro **antes** de aplicar qualquer coisa,
seção por seção, e os repositórios são casados com o que você já tem — primeiro pela
URL do remote, depois pela pasta — para que importar não clone o mundo de novo.

**Veja também:** [Cofre](vault.md) · [Segurança e segredos](security.md)
