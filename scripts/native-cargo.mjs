import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const executable = process.platform === 'win32' ? 'cargo.exe' : 'cargo'

function cargoFromPath() {
  for (const directory of (process.env.PATH ?? '').split(delimiter)) {
    const candidate = join(directory, executable)
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

function rustupToolchainCargo() {
  const rustupHome = process.env.RUSTUP_HOME ?? join(homedir(), '.rustup')
  const toolchains = join(rustupHome, 'toolchains')
  if (!existsSync(toolchains)) return undefined

  const installed = readdirSync(toolchains)
    .sort((left, right) => Number(right.startsWith('stable')) - Number(left.startsWith('stable')))
  for (const toolchain of installed) {
    const candidate = join(toolchains, toolchain, 'bin', executable)
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

const cargo = process.env.CARGO ?? cargoFromPath() ?? rustupToolchainCargo()
if (!cargo) {
  process.stderr.write('Rust Cargo missing. Install Rust via rustup or set CARGO to cargo path.\n')
  process.exit(127)
}

const exportResult = spawnSync(process.execPath, [join(root, 'scripts/export-native-i18n.mjs')], {
  cwd: root,
  stdio: 'inherit'
})
if (exportResult.status !== 0) process.exit(exportResult.status ?? 1)

const cargoDirectory = dirname(cargo)
const rustc = join(cargoDirectory, process.platform === 'win32' ? 'rustc.exe' : 'rustc')
const cargoArgs = process.argv.slice(2)
if (cargoArgs.length === 0) cargoArgs.push('check')
cargoArgs.push('--manifest-path', join(root, 'native/Cargo.toml'))
const result = spawnSync(cargo, cargoArgs, {
  cwd: root,
  env: {
    ...process.env,
    PATH: [cargoDirectory, process.env.PATH ?? ''].filter(Boolean).join(delimiter),
    ...(existsSync(rustc) ? { RUSTC: process.env.RUSTC ?? rustc } : {})
  },
  stdio: 'inherit'
})
process.exit(result.status ?? 1)
