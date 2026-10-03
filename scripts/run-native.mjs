import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, dirname, join, resolve } from 'node:path'
import { execFileSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
execFileSync(process.execPath, [join(root, 'scripts/export-native-i18n.mjs')], { cwd: root, stdio: 'inherit' })
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

const cargoDirectory = dirname(cargo)
const rustc = join(cargoDirectory, process.platform === 'win32' ? 'rustc.exe' : 'rustc')
const child = spawn(cargo, ['run', '--manifest-path', join(root, 'native', 'Cargo.toml'), '--', ...process.argv.slice(2)], {
  cwd: root,
  env: {
    ...process.env,
    PATH: [cargoDirectory, process.env.PATH ?? ''].filter(Boolean).join(delimiter),
    ...(existsSync(rustc) ? { RUSTC: process.env.RUSTC ?? rustc } : {})
  },
  stdio: 'inherit'
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}
child.on('error', (error) => {
  process.stderr.write(`Could not start Rust app: ${error.message}\n`)
  process.exitCode = 1
})
child.on('exit', (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 1)
})
