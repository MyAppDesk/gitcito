import { app, BrowserWindow, dialog, ipcMain, nativeImage, type NativeImage } from 'electron'
import { join } from 'path'
import { mkdir, readFile, rm, stat, writeFile } from 'fs/promises'
import {
  AVATAR_MAX_BYTES,
  avatarDataUrlPayload,
  avatarFitSize,
  avatarHeaderOk,
  imageHeaderSize,
  isProfileAvatarId
} from '../shared/profileAvatar'

/**
 * Profile pictures chosen as an image. One PNG per profile in the user-data
 * folder rather than inside the settings JSON: settings are rewritten on every
 * change and travel in exports, and a picture is neither small nor something
 * to rewrite each time a tab moves.
 *
 * Every image — picked or imported — is decoded and re-encoded through
 * `nativeImage` before it is written, so what lands on disk is always a plain
 * PNG of at most AVATAR_MAX_SIDE px, whatever the source file really was.
 * Before that decode, the size and the dimensions the header declares are
 * checked (avatarHeaderOk): a small file can still claim a huge bitmap.
 */

const avatarsDir = (): string => join(app.getPath('userData'), 'avatars')
const avatarPath = (id: string): string => join(avatarsDir(), `${id}.png`)
const asDataUrl = (png: Buffer): string => `data:image/png;base64,${png.toString('base64')}`

/** Scale down to the stored size and re-encode; null when it is not an image or too big to decode. */
function normalise(buf: Buffer): Buffer | null {
  if (!avatarHeaderOk(buf)) return null
  const img: NativeImage = nativeImage.createFromBuffer(buf)
  if (img.isEmpty()) return null
  const { width, height } = img.getSize()
  const fit = avatarFitSize(width, height)
  const scaled = fit.width === width && fit.height === height ? img : img.resize({ ...fit, quality: 'best' })
  return scaled.toPNG()
}

async function store(id: string, png: Buffer): Promise<void> {
  await mkdir(avatarsDir(), { recursive: true })
  await writeFile(avatarPath(id), png)
}

/** The stored picture as a data URL, or null when the profile has none. */
async function readAvatar(id: string): Promise<string | null> {
  if (!isProfileAvatarId(id)) return null
  const png = await readFile(avatarPath(id)).catch(() => null)
  return png ? asDataUrl(png) : null
}

export function registerProfileAvatarHandlers(): void {
  ipcMain.handle('profileAvatar:get', (_e, id: unknown) => (isProfileAvatarId(id) ? readAvatar(id) : null))

  // Ask for a file and store it. Returns the new data URL, null when cancelled,
  // or `{ error }` when the file is not an image nativeImage can read. The
  // title and filter label come from the renderer, which knows the language.
  ipcMain.handle('profileAvatar:pick', async (e, id: unknown, title: unknown, filterName: unknown) => {
    if (!isProfileAvatarId(id)) return { error: 'invalid' }
    const win = BrowserWindow.fromWebContents(e.sender)
    const opts = {
      title: typeof title === 'string' ? title : undefined,
      properties: ['openFile' as const],
      // nativeImage decodes PNG and JPEG only; offering more would only fail later.
      filters: [{ name: typeof filterName === 'string' ? filterName : 'PNG, JPEG', extensions: ['png', 'jpg', 'jpeg'] }]
    }
    const { canceled, filePaths } = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (canceled || !filePaths[0]) return null
    // Size first, so a huge file is never read into memory.
    const info = await stat(filePaths[0]).catch(() => null)
    if (!info?.isFile()) return { error: 'unreadable' }
    if (info.size > AVATAR_MAX_BYTES) return { error: 'tooLarge' }
    const buf = await readFile(filePaths[0]).catch(() => null)
    if (!buf) return { error: 'unreadable' }
    // A readable header that fails the check is an image, just too big to decode.
    if (imageHeaderSize(buf) && !avatarHeaderOk(buf)) return { error: 'tooLarge' }
    const png = normalise(buf)
    if (!png) return { error: 'unreadable' }
    await store(id, png)
    return asDataUrl(png)
  })

  ipcMain.handle('profileAvatar:remove', async (_e, id: unknown) => {
    if (isProfileAvatarId(id)) await rm(avatarPath(id), { force: true })
  })

  // Settings export: the pictures of the given profiles that have one.
  ipcMain.handle('profileAvatar:exportAll', async (_e, ids: unknown) => {
    const out: Record<string, string> = {}
    if (!Array.isArray(ids)) return out
    for (const id of ids) {
      const url = isProfileAvatarId(id) ? await readAvatar(id) : null
      if (url) out[id as string] = url
    }
    return out
  })

  // Settings import. The file came from anywhere, so each entry is checked
  // (id, PNG data URL, size) and then decoded: only a real image is written.
  ipcMain.handle('profileAvatar:importAll', async (_e, data: unknown) => {
    let imported = 0
    if (!data || typeof data !== 'object') return imported
    for (const [id, url] of Object.entries(data as Record<string, unknown>)) {
      const payload = isProfileAvatarId(id) ? avatarDataUrlPayload(url) : null
      if (!payload) continue
      const png = normalise(Buffer.from(payload, 'base64'))
      if (!png) continue
      await store(id, png)
      imported++
    }
    return imported
  })
}
