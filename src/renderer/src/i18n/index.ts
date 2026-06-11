import type { Language } from '../../../shared/types'
import { useSettingsStore } from '../stores/settings'

// ─── Translation dictionaries ────────────────────────────────────────────────

const en = {
  // Sidebar sections
  'sidebar.local': 'LOCAL',
  'sidebar.remotes': 'REMOTES',
  'sidebar.pullRequests': 'PULL REQUESTS',
  'sidebar.tags': 'TAGS',
  'sidebar.stashes': 'STASHES',
  'sidebar.worktrees': 'WORKTREES',
  'sidebar.filter': 'Filter branches, tags…',
  'sidebar.noStashes': 'No stashes',
  'sidebar.noPRs': 'No open PRs loaded',
  'sidebar.noTags': 'No tags',
  'sidebar.noWorktrees': 'No linked worktrees',
  'sidebar.reorderHint': 'Drag to reorder',
  'sidebar.fetchPRs': 'Fetch pull requests',
  'sidebar.addWorktree': 'Add worktree…',
  'sidebar.removeWorktree': 'Remove worktree',
  'sidebar.addRemote': 'Add remote…',
  'sidebar.createTag': 'Create tag…',
  'sidebar.removeRemote': 'Remove remote',
  'sidebar.noRemotes': 'No remotes',
  'sidebar.noBranches': 'No remote branches',
  'sidebar.remoteUrl': 'Remote URL',
  'sidebar.openWorktree': 'Open in new window',
  'sidebar.revealWorktree': 'Reveal in folder',
  'sidebar.copyPath': 'Copy path',

  // Common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.create': 'Create',
  'common.close': 'Close',
  'common.rename': 'Rename',
  'common.add': 'Add',

  // Conflict resolver
  'conflict.resolved': 'resolved',
  'conflict.allOurs': 'All ours',
  'conflict.allTheirs': 'All theirs',
  'conflict.none': 'Clear all',
  'conflict.saveResolution': 'Save resolution',
  'conflict.output': 'Output',
  'conflict.editFreely': 'edit freely',
  'conflict.outputPlaceholder': 'Final resolved content will appear here…',
  'conflict.lines': 'lines',
  'conflict.takeWholeSide': 'Take whole side',
  'conflict.takeLine': 'Include this line',
  'conflict.noMarkers':
    'No inline conflict markers found. Choose which side to keep, or stage file as-is.',
  'conflict.keepOurs': 'Keep ours',
  'conflict.keepTheirs': 'Keep theirs',
  'conflict.deleteFile': 'Delete file',
  'conflict.stageAsIs': 'Stage as-is',

  // Graph
  'graph.loadMore': 'Load more commits…',
  'graph.loading': 'Loading graph…',
  'graph.noCommits': 'No commits yet — make your first commit!',
  'graph.wip': 'Work in progress',

  // Settings
  'settings.title': 'Settings',
  'settings.profile': 'Profile',
  'settings.integrations': 'Integrations',
  'settings.ai': 'AI',
  'settings.themes': 'Themes',
  'settings.general': 'General',
  'settings.language': 'Language',
  'settings.languageHint': 'Interface language',
  'settings.graph': 'Commit graph',
  'settings.initialCommitCount': 'Initial commits loaded',
  'settings.initialCommitCountHint': 'How many commits to load when opening a repository.',
  'settings.loadMoreCount': 'Commits per “load more”',
  'settings.autoLoadOnScroll': 'Auto-load more on scroll',
  'settings.autoLoadOnScrollHint': 'Load additional commits automatically when you reach the bottom.',
  'settings.relativeDates': 'Relative dates',
  'settings.relativeDatesHint': 'Show “3d ago” instead of absolute dates in the graph.',
  'settings.behaviour': 'Behaviour',
  'settings.autoFetch': 'Auto-fetch every (minutes)',
  'settings.autoFetchHint': '0 disables automatic background fetching.',
  'settings.confirmForcePush': 'Confirm before force push',
  'settings.confirmForcePushHint': 'Ask for confirmation before any force push.',

  // Settings — sidebars
  'settings.profilesHeader': 'PROFILES',
  'settings.sectionsHeader': 'SECTIONS',
  'settings.newProfile': 'New profile',

  // Settings — profile page
  'settings.profileName': 'Profile name',
  'settings.makeActive': 'Make active',
  'settings.activeProfile': 'Active profile',
  'settings.deleteProfile': 'Delete profile',
  'settings.deleteProfileConfirm': 'Delete profile “{name}”? This cannot be undone.',
  'settings.gitIdentity': 'Git identity',
  'settings.name': 'Name',
  'settings.email': 'Email',
  'settings.applyIdentity': 'Apply identity to current repo',

  // Settings — integrations page
  'settings.pat': 'Personal access token',
  'settings.appPassword': 'App password',
  'settings.createToken': 'Create a token',
  'settings.connected': 'Connected',
  'settings.notConnected': 'Not connected',
  'settings.integrationsForProfile': 'Connections for {name}',
  'settings.integrationsHint':
    'GitHub and Azure DevOps power pull-request listing today; GitLab and Bitbucket tokens are stored for upcoming integrations.',

  // Settings — AI page
  'settings.provider': 'Provider',
  'settings.apiKey': 'API key',
  'settings.apiKeyOptional': 'API key (optional)',
  'settings.notRequired': 'Not required',
  'settings.model': 'Model',
  'settings.fetchModels': 'Fetch models',
  'settings.fetchModelsTitle': 'Fetch available models from the provider',
  'settings.commitStyle': 'Commit message style',
  'settings.style': 'Style',
  'settings.advanced': 'Advanced settings',
  'settings.endpoint': 'Endpoint (OpenAI-compatible base URL)',
  'settings.customInstructions': 'Custom instructions',
  'settings.customInstructionsPlaceholder':
    'e.g. Always write commit messages in Spanish; keep summary under 50 chars…',
  'commitStyle.auto': 'Auto — ticket from branch, else conventional',
  'commitStyle.ticket': 'Ticket — “CMS-124: add login form”',
  'commitStyle.conventional': 'Conventional — “feat: add login form”',
  'commitStyle.gitmoji': 'Gitmoji — “✨ add login form”',
  'commitStyle.plain': 'Plain — “add login form”',

  // Settings — themes page
  'settings.appTheme': 'App theme',
  'settings.codeTheme': 'Code theme',
  'settings.createAppTheme': 'Create custom app theme',
  'settings.createCodeTheme': 'Create custom code theme',
  'settings.themeName': 'Theme name',
  'settings.saveTheme': 'Save theme',
  'settings.saveCodeTheme': 'Save code theme',
  'settings.livePreview': 'Live preview',
  'settings.codeFontSize': 'Code font size',
  'settings.deleteThemeHint': 'double-click to delete',
  'settings.savedTheme': 'Saved theme',
  'settings.savedCodeTheme': 'Saved code theme',

  // Settings — general page intros
  'settings.generalIntro': 'Core app defaults, graph loading and interaction safeguards.',
  'settings.graphIntro': 'Tune how much history is loaded and how the graph behaves while you browse.',
  'settings.behaviourIntro': 'Background syncing and safety prompts for destructive Git actions.',

  // Welcome
  'welcome.tagline': 'Beautiful commits. Fearless branching.',
  'welcome.openRepo': 'Open repository',
  'welcome.cloneRepo': 'Clone repository',
  'welcome.recent': 'Recent'
}

type Dict = typeof en
export type TranslationKey = keyof Dict

const es: Dict = {
  'sidebar.local': 'LOCALES',
  'sidebar.remotes': 'REMOTOS',
  'sidebar.pullRequests': 'PULL REQUESTS',
  'sidebar.tags': 'ETIQUETAS',
  'sidebar.stashes': 'STASHES',
  'sidebar.worktrees': 'WORKTREES',
  'sidebar.filter': 'Filtrar ramas, etiquetas…',
  'sidebar.noStashes': 'Sin stashes',
  'sidebar.noPRs': 'No hay PRs abiertos cargados',
  'sidebar.noTags': 'No hay etiquetas',
  'sidebar.noWorktrees': 'Sin worktrees vinculados',
  'sidebar.reorderHint': 'Arrastra para reordenar',
  'sidebar.fetchPRs': 'Actualizar pull requests',
  'sidebar.addWorktree': 'Añadir worktree…',
  'sidebar.removeWorktree': 'Eliminar worktree',
  'sidebar.addRemote': 'Añadir remoto…',
  'sidebar.createTag': 'Crear etiqueta…',
  'sidebar.removeRemote': 'Eliminar remoto',
  'sidebar.noRemotes': 'Sin remotos',
  'sidebar.noBranches': 'Sin ramas remotas',
  'sidebar.remoteUrl': 'URL del remoto',
  'sidebar.openWorktree': 'Abrir en ventana nueva',
  'sidebar.revealWorktree': 'Mostrar en carpeta',
  'sidebar.copyPath': 'Copiar ruta',

  'common.save': 'Guardar',
  'common.cancel': 'Cancelar',
  'common.delete': 'Eliminar',
  'common.create': 'Crear',
  'common.close': 'Cerrar',
  'common.rename': 'Renombrar',
  'common.add': 'Añadir',

  'conflict.resolved': 'resueltos',
  'conflict.allOurs': 'Todo nuestro',
  'conflict.allTheirs': 'Todo suyo',
  'conflict.none': 'Limpiar todo',
  'conflict.saveResolution': 'Guardar resolución',
  'conflict.output': 'Resultado',
  'conflict.editFreely': 'edita libremente',
  'conflict.outputPlaceholder': 'El contenido final resuelto aparecerá aquí…',
  'conflict.lines': 'líneas',
  'conflict.takeWholeSide': 'Tomar todo el lado',
  'conflict.takeLine': 'Incluir esta línea',
  'conflict.noMarkers':
    'No se encontraron marcadores de conflicto. Elige qué lado conservar o prepara el archivo tal cual.',
  'conflict.keepOurs': 'Conservar nuestro',
  'conflict.keepTheirs': 'Conservar suyo',
  'conflict.deleteFile': 'Eliminar archivo',
  'conflict.stageAsIs': 'Preparar tal cual',

  'graph.loadMore': 'Cargar más commits…',
  'graph.loading': 'Cargando grafo…',
  'graph.noCommits': 'Aún no hay commits, ¡haz el primero!',
  'graph.wip': 'Trabajo en curso',

  'settings.title': 'Ajustes',
  'settings.profile': 'Perfil',
  'settings.integrations': 'Integraciones',
  'settings.ai': 'IA',
  'settings.themes': 'Temas',
  'settings.general': 'General',
  'settings.language': 'Idioma',
  'settings.languageHint': 'Idioma de la interfaz',
  'settings.graph': 'Grafo de commits',
  'settings.initialCommitCount': 'Commits iniciales cargados',
  'settings.initialCommitCountHint': 'Cuántos commits cargar al abrir un repositorio.',
  'settings.loadMoreCount': 'Commits por “cargar más”',
  'settings.autoLoadOnScroll': 'Cargar más al hacer scroll',
  'settings.autoLoadOnScrollHint': 'Carga commits adicionales automáticamente al llegar al final.',
  'settings.relativeDates': 'Fechas relativas',
  'settings.relativeDatesHint': 'Muestra “hace 3d” en lugar de fechas absolutas en el grafo.',
  'settings.behaviour': 'Comportamiento',
  'settings.autoFetch': 'Auto-fetch cada (minutos)',
  'settings.autoFetchHint': '0 desactiva el fetch automático en segundo plano.',
  'settings.confirmForcePush': 'Confirmar antes de force push',
  'settings.confirmForcePushHint': 'Pedir confirmación antes de cualquier force push.',

  'settings.profilesHeader': 'PERFILES',
  'settings.sectionsHeader': 'SECCIONES',
  'settings.newProfile': 'Nuevo perfil',

  'settings.profileName': 'Nombre del perfil',
  'settings.makeActive': 'Activar',
  'settings.activeProfile': 'Perfil activo',
  'settings.deleteProfile': 'Eliminar perfil',
  'settings.deleteProfileConfirm': '¿Eliminar el perfil “{name}”? Esta acción no se puede deshacer.',
  'settings.gitIdentity': 'Identidad de Git',
  'settings.name': 'Nombre',
  'settings.email': 'Correo',
  'settings.applyIdentity': 'Aplicar identidad al repositorio actual',

  'settings.pat': 'Token de acceso personal',
  'settings.appPassword': 'Contraseña de aplicación',
  'settings.createToken': 'Crear un token',
  'settings.connected': 'Conectado',
  'settings.notConnected': 'Sin conectar',
  'settings.integrationsForProfile': 'Conexiones de {name}',
  'settings.integrationsHint':
    'GitHub y Azure DevOps ya permiten listar pull requests; los tokens de GitLab y Bitbucket se guardan para próximas integraciones.',

  'settings.provider': 'Proveedor',
  'settings.apiKey': 'Clave de API',
  'settings.apiKeyOptional': 'Clave de API (opcional)',
  'settings.notRequired': 'No necesaria',
  'settings.model': 'Modelo',
  'settings.fetchModels': 'Obtener modelos',
  'settings.fetchModelsTitle': 'Obtener los modelos disponibles del proveedor',
  'settings.commitStyle': 'Estilo del mensaje de commit',
  'settings.style': 'Estilo',
  'settings.advanced': 'Ajustes avanzados',
  'settings.endpoint': 'Endpoint (URL base compatible con OpenAI)',
  'settings.customInstructions': 'Instrucciones personalizadas',
  'settings.customInstructionsPlaceholder':
    'p. ej. Escribe siempre los mensajes en español; resumen de menos de 50 caracteres…',
  'commitStyle.auto': 'Auto — ticket desde la rama, si no convencional',
  'commitStyle.ticket': 'Ticket — “CMS-124: añadir formulario de login”',
  'commitStyle.conventional': 'Convencional — “feat: añadir formulario de login”',
  'commitStyle.gitmoji': 'Gitmoji — “✨ añadir formulario de login”',
  'commitStyle.plain': 'Simple — “añadir formulario de login”',

  'settings.appTheme': 'Tema de la app',
  'settings.codeTheme': 'Tema del código',
  'settings.createAppTheme': 'Crear tema de app personalizado',
  'settings.createCodeTheme': 'Crear tema de código personalizado',
  'settings.themeName': 'Nombre del tema',
  'settings.saveTheme': 'Guardar tema',
  'settings.saveCodeTheme': 'Guardar tema de código',
  'settings.livePreview': 'Vista previa',
  'settings.codeFontSize': 'Tamaño de fuente del código',
  'settings.deleteThemeHint': 'doble clic para eliminar',
  'settings.savedTheme': 'Tema guardado',
  'settings.savedCodeTheme': 'Tema de código guardado',

  'settings.generalIntro': 'Valores por defecto, carga del grafo y salvaguardas de interacción.',
  'settings.graphIntro': 'Ajusta cuánto historial se carga y cómo se comporta el grafo al navegar.',
  'settings.behaviourIntro': 'Sincronización en segundo plano y confirmaciones para acciones destructivas de Git.',

  'welcome.tagline': 'Commits bonitos. Ramas sin miedo.',
  'welcome.openRepo': 'Abrir repositorio',
  'welcome.cloneRepo': 'Clonar repositorio',
  'welcome.recent': 'Recientes'
}

const dictionaries: Record<Language, Dict> = { en, es }

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' }
]

export function translate(lang: Language, key: TranslationKey): string {
  return dictionaries[lang]?.[key] ?? dictionaries.en[key] ?? key
}

/** Non-reactive translator (for use outside React render). */
export function t(key: TranslationKey): string {
  const lang = useSettingsStore.getState().settings.language ?? 'en'
  return translate(lang, key)
}

/** Reactive hook: re-renders when the language setting changes. */
export function useT(): (key: TranslationKey) => string {
  const lang = useSettingsStore((s) => s.settings.language ?? 'en')
  return (key: TranslationKey) => translate(lang, key)
}
