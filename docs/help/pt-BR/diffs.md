---
title: Diffs e pré-visualizações
category: Lendo mudanças
order: 20
summary: Visão dividida, destaque em nível de palavra, diff de imagens e pré-visualização de arquivos.
keywords: diff split dividido lado a lado side-by-side palavra word level espaços em branco whitespace imagem image diff preview pré-visualização markdown docx pdf
---

# Diffs e pré-visualizações

## Lendo um diff

| Alternância | O que faz |
|---|---|
| **Unificado ↔ dividido** | Lado a lado quando você quer comparar, empilhado quando você quer ler |
| **Nível de palavra** | Destaca só os tokens alterados dentro de uma linha editada — vermelho no antigo, verde no novo |
| **Ignorar espaços em branco** | Esconde reindentação para a mudança de verdade aparecer |
| **Quebrar linha** (só na visão lado a lado) | Quebra linhas longas dentro da coluna em vez de rolá-las |
| **Vinculado** (lado a lado, sem quebra) | Rola as duas metades juntas, na vertical e na horizontal — desligado, cada coluna rola sozinha |
| <kbd>⌘F</kbd> | Buscar dentro do diff, com navegação para o próximo/anterior |

A quebra vem desligada: uma linha ocupa uma única fileira, então os dois lados
continuam comparáveis fileira a fileira, e cada metade rola na horizontal com a
própria barra. Ligue quando preferir ler uma linha longa a persegui-la — em
troca, uma linha dobrada em três fileiras deixa de ficar de frente para sua
contraparte. Cada interruptor lembra o estado entre arquivos e sessões.

Sem quebra, as duas metades rolam **vinculadas** por padrão — na vertical, o
que mantém as fileiras de frente uma para a outra, e na horizontal, então a
coluna 90 da esquerda fica sobre a 90 da direita. Desvincule quando os lados
tiverem se afastado — um bloco indentado contra um sem indentação, uma
renomeação que deslocou cada linha — ou quando quiser comparar duas regiões
distantes do mesmo arquivo, e deixe cada metade onde está o seu conteúdo.

![Diff dividido com destaque em nível de palavra](../../screenshots/split-diff.webp)

Acima de todo diff fica o [resumo semântico](semantic-diff.md) — o que mudou,
símbolo por símbolo, em vez de linha por linha.

## Diff de imagens

Imagens alteradas ganham uma comparação de verdade: lado a lado, ou uma alça de
arrastar entre o antes e o depois.

![Diff de imagem](../../screenshots/image-diff.webp)

## Barra de alterações e minimapa

A **visualização de arquivo** de um arquivo da árvore de trabalho — staged ou não, rastreado ou totalmente novo — carrega uma barra colorida ao lado de cada linha alterada desde o HEAD (ou o índice, para arquivos staged): verde para uma inserção, azul para uma modificação, uma pequena cunha vermelha onde linhas foram removidas sem substituição. Clique em uma barra para ver essa alteração sem sair do arquivo — o popup mostra as linhas removidas e adicionadas, com próximo/anterior para percorrer todas as alterações do arquivo.

![Barra de alterações com um popup de hunk aberto, minimapa à direita](../../screenshots/change-gutter.webp)

O **minimapa**, desativado por padrão, adiciona uma visão geral em escala do arquivo inteiro na borda direita — clique ou arraste para navegar, como faria uma barra de rolagem se também mostrasse a forma do arquivo. Ambos são configurações por máquina em **Configurações → Geral → Visualizador de arquivos**.

Nenhum dos dois lê o histórico: mude para Diff, Blame ou um commit mais antigo e a barra desaparece — essas visualizações já mostram cada alteração diretamente.

## Pré-visualize qualquer coisa

O modo **Pré-visualização** renderiza o arquivo em vez de mostrar o código-fonte
dele: Markdown, Word (`.docx`), Excel (`.xlsx`), PDF, vídeo, áudio, imagens, e
código com destaque de sintaxe para todo o resto.

![Pré-visualização de Markdown](../../screenshots/markdown-preview.webp)

### Property lists da Apple

`Info.plist` e `*.entitlements` são XML, e XML não é o que ninguém está tentando
ler. A preview mostra o esquema de chave/valor no lugar — a forma que o próprio
editor de plist do Xcode mostra — com o aninhamento intacto e o tipo de cada
valor ao lado.

![Um Info.plist como esquema de chave e valor](../../screenshots/preview-plist.webp)

Dois limites. Uma plist **binária** (`bplist00`) é reconhecida e nomeada, não
decodificada — passe `plutil -convert xml1` nela se quiser vê-la aqui, embora uma
plist binária num repositório costume ser um artefato de build que não deveria
estar versionado. E valores `<data>` aparecem como uma contagem de bytes em vez
de base64: um blob não te diz nada, e um perfil de provisionamento renderizado
num painel que você talvez esteja compartilhando diz demais a todo mundo.

### Projetos do Xcode

Um `project.pbxproj` é um único dicionário plano de objetos que apontam uns para
os outros por identificador, então lê-lo em ordem quase não diz nada sobre o
projeto. A preview percorre essas referências e reconstrói as três coisas que
você veio buscar: os **alvos** com suas fases de build, a **árvore de grupos**
como o navegador do Xcode a desenha, e as **configurações de build** por
configuração.

![Um project.pbxproj como alvos, árvore de arquivos e configurações](../../screenshots/preview-xcodeproj.webp)

Ela lê, não edita — nada aqui escreve no projeto. Para o que acontece quando dois
branches mexem no mesmo, veja [resolver conflitos](conflicts.md).

## Arquivos muito grandes

As pré-visualizações e a visão de arquivo carregam o arquivo inteiro na
memória, então ambas recusam arquivos acima de um limite de tamanho (32 MB
para pré-visualizações, 16 MB para texto) e mostram, em vez disso, o tamanho
do arquivo. **Carregar mesmo assim** derruba o limite para aquele arquivo —
nada fica fora de alcance, cargas grandes são apenas opcionais. Arquivos e
diffs com mais de alguns milhares de linhas continuam sendo renderizados por
completo, mas linhas fora da área visível não são mais dispostas nem pintadas,
então um diff gigante de lockfile deixa de custar a memória de um laptop
inteiro.

![Um arquivo acima do limite de tamanho, com Carregar mesmo assim](../../screenshots/file-too-large.webp)

## Aba de arquivos

A aba **Arquivos** da barra lateral esquerda navega pela própria árvore de
trabalho, com selos de status nas pastas (adicionado / modificado / removido) que
agregam o que está dentro delas.

![A aba de arquivos com uma pré-visualização](../../screenshots/file-tree.webp)

![Selos de pasta somando o que mudou dentro de cada uma](../../screenshots/tree-badges.webp)

**Veja também:** [Diff semântico](semantic-diff.md) · [Staging](staging.md)
