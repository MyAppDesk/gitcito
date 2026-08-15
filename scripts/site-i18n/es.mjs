// Website chrome in es. Keys mirror en.mjs; anything missing falls back to English.
export const es = {
  'nav.handbook': 'Manual',
  'nav.roadmap': 'Hoja de ruta',
  'nav.github': 'GitHub',
  'nav.sponsor': 'Patrocinar',
  'nav.download': 'Descargar',

  'foot.license': 'Licencia MIT · Hecho por <a href="https://myappdesk.dev">MyAppDesk</a> con 💜',
  'foot.source': 'Código fuente',
  'foot.roadmap': 'Hoja de ruta',
  'foot.reportIssue': 'Informar de un problema',
  'foot.sponsor': 'Patrocinar',

  'meta.title': 'Gitcito — todo git, con una interfaz que te lo muestra',
  'meta.description':
    'Un cliente de Git enteramente vibe-coded. Gratis. Grafo, preparación línea a línea, rebase, worktrees, submódulos, LFS — y unas pocas cosas que otros clientes no hacen.',

  'hero.title': 'Todo git,<br /><em>con una interfaz que te lo muestra</em>',
  'hero.lede':
    'Grafo, preparación línea a línea, rebase, worktrees, submódulos, LFS.<br />Lo de siempre, bien hecho — y unas pocas cosas que no hace nadie más.',
  'hero.download': 'Descargar para tu plataforma',
  'hero.source': 'Ver el código',
  'hero.terms': 'Gratis · MIT · v{version}',
  'hero.graphAlt': 'El grafo de commits de Gitcito',

  'features.title': 'Unas pocas cosas que otros clientes no hacen',
  'features.sub':
    'Ninguna de ellas es la razón para usar Gitcito — la razón es la lista de arriba. Existen porque git ya sabe la respuesta y ningún cliente se molesta en preguntársela.',

  'ordinary.title': 'Lo que incluye',
  'ordinary.sub':
    'Un cliente completo, no un subconjunto. Todo construido, documentado y en la app hoy — las cosas de siempre, que son la mayor parte de lo que de verdad es usar git.',
  'ordinary.graph': 'Grafo de commits con carriles de verdad, en ventana para historiales enormes',
  'ordinary.staging': 'Preparación hasta línea a línea',
  'ordinary.conflicts': 'Resolutor de conflictos a tres paneles que dice qué lado es cuál',
  'ordinary.rebase': 'Rebase interactivo arrastrando',
  'ordinary.stacks': 'Ramas apiladas con recolocación en cascada',
  'ordinary.recovery': 'Reflog, instantáneas de trabajo en curso, bisect guiado',
  'ordinary.prs': 'Pull requests en GitHub, GitLab, Bitbucket y Azure DevOps',
  'ordinary.terminal': 'Terminal integrado — un PTY de verdad',
  'ordinary.launch': 'Ejecutar y depurar directamente desde <code>.vscode/launch.json</code>',
  'ordinary.ai': 'IA opcional que cita las líneas que ha leído',
  'ordinary.themes': 'Temas incluidos, claro y oscuro, más los generados por IA',
  'ordinary.languages': 'Todo traducido, manual incluido — el árabe y el hebreo reflejan la interfaz',
  'ordinary.conflictAlt': 'El resolutor de conflictos',

  'download.title': 'Descargar',
  'download.sub':
    'Última versión: <strong>v{version}</strong>. Cada build se publica desde CI.',
  'download.cli':
    'O abre un repositorio desde tu terminal con <code>gitcito .</code> — mira <a href="{cli}">la línea de comandos</a>.',
  'download.macNote': 'Apple silicon &amp; Intel · firmado y notarizado',
  'download.winNote': 'Instalador (x64)',
  'download.linuxNote': 'AppImage · deb',
  'download.forOs': 'Descargar para {os}',

  'handbook.title': 'Un manual de {pages} páginas, dentro de la app',
  'handbook.sub': 'Cada función explicada — sin conexión en la app, y aquí mismo.',

  'sponsor.title': 'Patrocina Gitcito',
  'sponsor.body':
    'Gratis, MIT, sin backend, sin telemetría, nada que colocarte — así que no hay nada que comprar. El patrocinio paga el certificado de Apple Developer que necesitan las builds firmadas de macOS, el manual y las traducciones. Un informe de error vale exactamente lo mismo.',
  'sponsor.cta': 'Patrocinar en GitHub',

  'doc.titleSuffix': 'Manual de Gitcito',
  'doc.filter': 'Filtrar páginas…',
  'doc.filterLabel': 'Filtrar páginas',
  'doc.edit': 'Editar esta página en GitHub',
  'doc.improve': 'Mejorar esta traducción en GitHub',

  'feature.conflict-radar.title': 'Radar de conflictos',
  'feature.conflict-radar.body':
    'Ve qué ramas van a dar conflicto <strong>antes</strong> de fusionar ninguna. Las fusiones ocurren dentro de la base de datos de objetos — sin checkout, sin tocar el árbol de trabajo, nada que limpiar.',
  'feature.semantic-diff.title': 'Diff semántico',
  'feature.semantic-diff.body':
    '<code>startServer</code> → <code>bootServer</code>, en vez de un muro rojo y verde de 400 líneas. Análisis real con tree-sitter, no una expresión regular.',
  'feature.range-diff.title': 'Qué ha cambiado desde',
  'feature.range-diff.body':
    'Han hecho force-push a la rama que revisaste. Mira qué commits se reescribieron, se descartaron o se añadieron — las posiciones antiguas salen gratis del reflog.',
  'feature.absorb.title': 'Absorber',
  'feature.absorb.body':
    'Prepara tus arreglos de revisión y deja que blame lleve cada hunk al commit que lo introdujo, como un <code>fixup!</code>.',
  'feature.time-machine.title': 'Máquina del tiempo',
  'feature.time-machine.body':
    'Arrastra un deslizador y mira cómo cambia el repositorio: los archivos aparecen, se mueven, vuelven. HEAD no se mueve y tu trabajo sin commitear queda intacto.',
  'feature.timelapse.title': 'Timelapse',
  'feature.timelapse.body':
    'Reproduce la vida entera del repositorio como una animación — y expórtala como vídeo, grabado en la propia página, sin ningún codificador que instalar.',
  'feature.pr-preview.title': 'Previsualizar un pull request',
  'feature.pr-preview.body':
    'Ejecuta el PR de otra persona — forks incluidos — sin hacer ningún commit. Sin token de API, sin un segundo remoto: la head se descarga de la ref que el host ya publica, en GitHub, GitLab, Bitbucket, Azure DevOps o Gitea.',
  'feature.mission-control.title': 'Centro de control',
  'feature.mission-control.body':
    'Todos los repositorios del espacio de trabajo en una pantalla, ordenados por lo que te reclama: primero los bloqueados, luego los que hay que sincronizar, luego los sucios, luego los tranquilos.',
  'feature.attributes.title': 'Atributos de archivo, con interfaz',
  'feature.attributes.body':
    'El archivo más útil de git que nadie escribe. Los finales de línea resueltos de una vez para todos, un changelog que deja de dar conflictos, fixtures fuera de los tarballs de publicación — y diffs legibles para Word y PDF, cuando el conversor está instalado.',
  'feature.languages.title': 'Tu idioma, probablemente',
  'feature.languages.body':
    'No una traducción de adorno de los botones — toda la interfaz, explicaciones incluidas. El árabe y el hebreo reflejan la disposición, mientras que el grafo, los diffs, las rutas y el terminal siguen de izquierda a derecha, porque esa es la dirección en la que se lee el código.',
  'feature.security.title': 'Tus secretos siguen siendo tuyos',
  'feature.security.body':
    'Sin backend. Los tokens y las entradas de la caja fuerte se cifran con el llavero de tu sistema — y nada toca ese llavero hasta que se te ha dicho para qué y has dicho que sí.'
}
