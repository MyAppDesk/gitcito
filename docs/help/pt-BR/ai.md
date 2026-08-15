---
title: Recursos de IA
category: IA
order: 80
summary: Opcionais, agnósticos de provedor, e ancorados no seu código de verdade.
keywords: ia ai openai anthropic ollama llm local mensagem de commit explicar revisão wiki ancorado grounded
---

# Recursos de IA

Todo recurso de IA é **opcional** e fica desligado até você configurar um provedor.
Nada é enviado para lugar nenhum até você pedir algo específico.

![Configurações de IA](../../screenshots/settings-ai.webp)

## Provedores

Presets para **OpenAI, Anthropic, OpenRouter, Groq, Mistral e Ollama** (inteiramente
local), ou qualquer endpoint compatível com a OpenAI. Os modelos são buscados ao
vivo, e você pode adicionar instruções personalizadas.

> Só a OpenAI é bem testada na prática. Os outros usam um formato de chamada
> compatível com o da OpenAI e deveriam funcionar — mas não estão verificados.

## O que ela consegue fazer

| Recurso | O que você recebe |
|---|---|
| **Mensagem de commit** | Resumo (e corpo opcional) a partir do seu diff preparado, no estilo que você escolheu |
| **Explicar este arquivo** | Explicação em linguagem simples num painel lateral — Normal, Conciso, ELI5… até Pirata |
| **Passar o mouse para explicar** | Segure <kbd>⇧</kbd> e aponte para um identificador para uma explicação de uma linha, mais as linhas em que ela se baseou |
| **Resolução de conflito** | Propõe um merge na saída editável — nunca aplica sozinha |
| **Revisão de PR** | Resume um diff e sinaliza riscos, cada um ancorado num `path:line` de verdade |
| **Descrição de PR** · **nomes de branch** | Redigidos a partir dos commits e do diff da branch |
| **Temas** · **paletas de grafo** | Gerados a partir de um prompt |
| **Staging inteligente** | Sugestões do que pertence a este commit |

## Ancorada, não chutando

A revisão vê o diff como **hunks rotulados** e só pode citar aqueles rótulos; o
Gitcito então resolve cada rótulo para um arquivo e uma linha de verdade. Um modelo
que inventa uma localização é **rejeitado e questionado de novo**, então os achados
sempre apontam para código que existe.

O explicar-ao-passar-o-mouse lê apenas uma janela numerada em volta do token — num
diff, só os hunks visíveis na tela — então quando uma definição mora em outro lugar
ele diz isso em vez de inventar. As respostas são cacheadas por versão de arquivo.

**Arquivos de segredo mascarados nunca são enviados.** Nem os arquivos cobertos pelas
regras de mascaramento de segredos.

**Veja também:** [Wiki do repo](repo-wiki.md) · [Segurança e segredos](security.md)
