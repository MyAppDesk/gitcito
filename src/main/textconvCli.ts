// Headless entry for the bundled git textconv filter. git runs the
// resources/cli/gitcito-textconv shim with one argument — a path to (a temp
// copy of) the file — and diffs whatever lands on stdout. The shim executes
// this file through the app binary with ELECTRON_RUN_AS_NODE, i.e. as plain
// Node: nothing imported from here may touch electron.
import { convertFile } from './textconv'

async function main(): Promise<void> {
  const file = process.argv[2]
  if (!file || file.startsWith('-')) {
    process.stderr.write('usage: gitcito-textconv <file>\n')
    process.exit(2)
  }
  try {
    process.stdout.write(await convertFile(file))
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`)
    process.exit(1)
  }
}

void main()
