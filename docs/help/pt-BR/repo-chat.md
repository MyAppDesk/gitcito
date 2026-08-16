---
title: Chat do repositório
category: IA
order: 82
summary: Faça perguntas sobre este repositório, com os arquivos e commits que você fixa como contexto.
keywords: chat pergunta perguntar assistente contexto anexar fixar arrastar soltar commit arquivo evidência ancorado ia painel
---

# Chat do repositório

Algumas perguntas se respondem mais rápido perguntando do que procurando. *Onde
o refresh do token acontece de verdade? O que este commit mudou, em uma frase?
Por que este arquivo existe?* O chat do repositório responde sobre o repositório
aberto e mostra as linhas em que se baseou.

Ele divide a coluna da direita com **Detalhes**: as abas no topo alternam entre
os dois, então o grafo não perde a seleção quando você pergunta algo.

## O que ele lê

Cada resposta é montada em duas passagens. A primeira escolhe um conjunto
pequeno de caminhos e buscas literais na lista de arquivos rastreados do próprio
repositório. A segunda responde usando apenas os trechos trazidos, e só pode
citar esses trechos: um arquivo ou linha inventados são erro de validação, não
uma resposta plausível.

| Incluído | Excluído |
|---|---|
| Arquivos rastreados, como estão na sua árvore de trabalho | Arquivos não rastreados |
| Diffs no stage e fora dele, de arquivos rastreados | Tudo que casa com uma regra de ignore, mesmo rastreado |
| Branch, à frente/atrás e a lista de caminhos alterados | [Arquivos com cara de segredo](security.md), binários, caminhos gerados |

Ler a árvore de trabalho permite falar de mudanças ainda não commitadas. Também
significa que essas mudanças saem da máquina ao perguntar: quem as recebe é o
provedor configurado em [Funções de IA](ai.md).

## Fixando contexto

O modelo decide o que ler. Fixar é como você passa por cima disso: o que está
fixado é lido **primeiro** e fica com a maior parte do orçamento de contexto.

Quatro formas de fixar, todas indo para a mesma fileira de chips acima da caixa
de mensagem:

| Faça isto | Você ganha |
|---|---|
| Clique em um chip sugerido | O arquivo aberto no visualizador, ou o commit selecionado no grafo |
| Arraste uma linha da aba **Arquivos** | Aquele arquivo |
| Arraste uma linha do **grafo de commits** | Aquele commit — a mensagem e o diff em blocos |
| **+** → *Escolher um arquivo…*, ou arraste do Finder/Explorador | Qualquer arquivo no disco, inclusive fora do repositório |

Os chips continuam fixados nas perguntas seguintes; o `×` tira um, e limpar a
conversa tira todos. O limite é oito.

Um commit fixado contribui com sua mensagem e até doze blocos de diff. Blocos que
tocam um caminho excluído saem daquele diff, não o commit inteiro.

## Configurações

**Configurações → IA → Chat do repositório**:

| Configuração | O que faz |
|---|---|
| **Faça perguntas sobre o repositório** | Desligado tira a aba, o botão da barra e o alvo do atalho. O resto da IA continua |
| **Modelo do chat** | Um modelo só para o chat. Vazio usa o do perfil: perguntar custa menos que revisar, um menor costuma bastar |
| **Apenas conteúdo commitado** | Responde a partir do último commit em vez da árvore de trabalho: alterações não commitadas nunca saem da máquina |

Com a IA desligada por completo, o chat some junto — nenhum painel oferecendo
resposta quando nada pode responder.

## O que ele recusa

- **Arquivos com cara de segredo nunca são lidos**, fixados ou não: o chip volta
  marcado como ignorado, com o motivo. Fixar não contorna o
  [mascaramento de segredos](security.md).
- **Binários e arquivos acima de 512 KB** vindos de fora do repositório são
  ignorados do mesmo jeito. Dentro dele valem as regras de sempre.
- **Ele nunca escreve.** Nada de stage, commit ou troca de branch: não tem
  ferramentas, só texto. Uma resposta que diz ter feito algo está descrevendo,
  não relatando.
- **As conversas vivem só na memória.** Cada repositório mantém seu fio; sair do
  Gitcito descarta tudo.

## Como abrir

| Teclas | O que faz |
|---|---|
| O botão de balão na barra de ferramentas | Alterna a aba Chat |
| <kbd>⌘⌥B</kbd> / <kbd>Ctrl+Alt+B</kbd> | Alterna o painel direito inteiro |
| <kbd>⌘⏎</kbd> / <kbd>Ctrl+Enter</kbd> | Envia a mensagem |

Veja [Teclado e atalhos](keyboard.md) para o resto, inclusive como remapear os
interruptores de painel.

**Veja também:** [Funções de IA](ai.md) · [Segurança e segredos](security.md) ·
[Wiki do repositório](repo-wiki.md)
