// Website chrome in pt-BR. Keys mirror en.mjs; anything missing falls back to English.
export const ptBR = {
  'nav.handbook': 'Manual',
  'nav.roadmap': 'Roadmap',
  'nav.github': 'GitHub',
  'nav.sponsor': 'Patrocinar',
  'nav.download': 'Baixar',

  'foot.license': 'Licenciado sob MIT · Feito pela <a href="https://myappdesk.dev">MyAppDesk</a> com 💜',
  'foot.source': 'Código-fonte',
  'foot.roadmap': 'Roadmap',
  'foot.reportIssue': 'Relatar um problema',
  'foot.sponsor': 'Patrocinar',

  'meta.title': 'Gitcito — o git inteiro, com uma interface que mostra tudo isso',
  'meta.description':
    'Um cliente Git inteiramente vibe-coded. Grátis. Grafo, staging linha a linha, rebase, worktrees, submódulos, LFS — além de algumas coisas que outros clientes não fazem.',

  'hero.title': 'O git inteiro,<br /><em>com uma interface que mostra tudo isso</em>',
  'hero.lede':
    'Grafo, staging linha a linha, rebase, worktrees, submódulos, LFS.<br />As coisas comuns, feitas direito — além de algumas que mais ninguém faz.',
  'hero.download': 'Baixar para a sua plataforma',
  'hero.source': 'Ver o código',
  'hero.terms': 'Grátis · MIT · v{version}',
  'hero.graphAlt': 'O grafo de commits do Gitcito',

  'features.title': 'Algumas coisas que outros clientes não fazem',
  'features.sub':
    'Nenhuma delas é o motivo para usar o Gitcito — o motivo é a lista acima. Elas existem porque o git já sabe a resposta e nenhum cliente se dá ao trabalho de perguntar.',

  'ordinary.title': 'O que está incluído',
  'ordinary.sub':
    'Um cliente completo, não um subconjunto. Tudo construído, documentado e no app hoje — as coisas comuns, que são a maior parte do que usar git realmente é.',
  'ordinary.graph': 'Grafo de commits com faixas de verdade, em janela para históricos enormes',
  'ordinary.staging': 'Staging até linha a linha',
  'ordinary.conflicts': 'Resolvedor de conflitos em três painéis que diz qual lado é qual',
  'ordinary.rebase': 'Rebase interativo arrastando',
  'ordinary.stacks': 'Branches empilhadas com restack em cascata',
  'ordinary.recovery': 'Reflog, snapshots de trabalho em andamento, bisect guiado',
  'ordinary.prs': 'Pull requests no GitHub, GitLab, Bitbucket e Azure DevOps',
  'ordinary.terminal': 'Terminal integrado — um PTY de verdade',
  'ordinary.launch': 'Rodar e depurar direto do <code>.vscode/launch.json</code>',
  'ordinary.ai': 'IA opcional que cita as linhas que leu',
  'ordinary.themes': 'Temas nativos, claro e escuro, além dos gerados por IA',
  'ordinary.languages': 'Tudo traduzido, manual incluído — árabe e hebraico espelham o layout',
  'ordinary.conflictAlt': 'O resolvedor de conflitos',

  'download.title': 'Baixar',
  'download.sub':
    'Versão mais recente: <strong>v{version}</strong>. Todo build é publicado pela CI.',
  'download.cli':
    'Ou abra um repositório pelo seu terminal com <code>gitcito .</code> — veja <a href="{cli}">a linha de comando</a>.',
  'download.macNote': 'Apple silicon &amp; Intel · assinado e notarizado',
  'download.winNote': 'Instalador (x64)',
  'download.linuxNote': 'AppImage · deb',
  'download.forOs': 'Baixar para {os}',

  'handbook.title': 'Um manual de {pages} páginas, dentro do app',
  'handbook.sub': 'Cada recurso explicado — offline no app, e aqui mesmo.',

  'sponsor.title': 'Patrocine o Gitcito',
  'sponsor.body':
    'Grátis, MIT, sem backend, sem telemetria, nada para te empurrar — então não há nada para comprar. O patrocínio paga o certificado da Apple Developer de que os builds assinados de macOS precisam, o manual e as traduções. Um relato de bug vale exatamente o mesmo.',
  'sponsor.cta': 'Patrocinar no GitHub',

  'doc.titleSuffix': 'Manual do Gitcito',
  'doc.filter': 'Filtrar páginas…',
  'doc.filterLabel': 'Filtrar páginas',
  'doc.edit': 'Editar esta página no GitHub',
  'doc.improve': 'Melhorar esta tradução no GitHub',

  'feature.conflict-radar.title': 'Radar de conflitos',
  'feature.conflict-radar.body':
    'Veja quais branches vão conflitar <strong>antes</strong> de fazer merge de qualquer uma delas. Os merges acontecem dentro do banco de objetos — sem checkout, sem mexer na árvore de trabalho, nada para limpar.',
  'feature.semantic-diff.title': 'Diff semântico',
  'feature.semantic-diff.body':
    '<code>startServer</code> → <code>bootServer</code>, em vez de um paredão vermelho e verde de 400 linhas. Parsing de verdade com tree-sitter, não uma expressão regular.',
  'feature.range-diff.title': 'O que mudou desde',
  'feature.range-diff.body':
    'Deram force-push na branch que você revisou. Veja quais commits foram reescritos, descartados ou adicionados — as posições antigas saem de graça do reflog.',
  'feature.repo-chat.title': 'Chat do repositório',
  'feature.repo-chat.body':
    'Faça uma pergunta a este repositório e receba uma resposta que cita as linhas lidas. Fixe os arquivos e commits que ela deve olhar — arraste do grafo, da árvore de arquivos ou de qualquer lugar do disco.',
  'feature.absorb.title': 'Absorb',
  'feature.absorb.body':
    'Prepare suas correções de revisão e deixe o blame levar cada hunk para o commit que o introduziu, como um <code>fixup!</code>.',
  'feature.time-machine.title': 'Máquina do tempo',
  'feature.time-machine.body':
    'Arraste um controle deslizante e veja o repositório mudar: arquivos aparecem, se movem, voltam. O HEAD não sai do lugar e o seu trabalho não commitado fica intacto.',
  'feature.timelapse.title': 'Timelapse',
  'feature.timelapse.body':
    'Reproduza a vida inteira do repositório como uma animação — e exporte em vídeo, gravado na própria página, sem encoder nenhum para instalar.',
  'feature.pr-preview.title': 'Pré-visualizar um pull request',
  'feature.pr-preview.body':
    'Rode o PR de outra pessoa — forks incluídos — sem commitar nada. Sem token de API, sem um segundo remoto: a head é buscada da ref que o próprio host já publica, no GitHub, GitLab, Bitbucket, Azure DevOps ou Gitea.',
  'feature.mission-control.title': 'Central de controle',
  'feature.mission-control.body':
    'Todo repositório do workspace numa tela só, ordenado pelo que precisa de você: bloqueados primeiro, depois os que falta sincronizar, depois os sujos, depois os quietos.',
  'feature.attributes.title': 'Atributos de arquivo, com interface',
  'feature.attributes.body':
    'O arquivo mais útil do git que ninguém escreve. Finais de linha resolvidos de uma vez para todo mundo, um changelog que para de conflitar, fixtures fora dos tarballs de release — e diffs legíveis para Word e PDF, quando o conversor está instalado.',
  'feature.languages.title': 'O seu idioma, provavelmente',
  'feature.languages.body':
    'Não uma tradução de fachada dos botões — a interface inteira, explicações incluídas. Árabe e hebraico espelham o layout, enquanto o grafo, os diffs, os caminhos e o terminal continuam da esquerda para a direita, porque é nessa direção que se lê código.',
  'feature.security.title': 'Seus segredos continuam seus',
  'feature.security.body':
    'Sem backend. Tokens e entradas do cofre são criptografados com o chaveiro do seu sistema — e nada toca esse chaveiro até você ter sido avisado para quê e ter dito sim.'
}
