import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const localeDir = join(root, 'src/renderer/src/i18n')
const outputPath = join(root, 'native/src/translations.json')

function unwrap(expression) {
  let node = expression
  while (ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isParenthesizedExpression(node)) {
    node = node.expression
  }
  return node
}

function dictionaryFrom(sourcePath) {
  const source = ts.createSourceFile(sourcePath, readFileSync(sourcePath, 'utf8'), ts.ScriptTarget.Latest, true)
  const exported = source.statements.find((statement) =>
    ts.isVariableStatement(statement) && statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) &&
    statement.declarationList.declarations.some((declaration) => ts.isObjectLiteralExpression(unwrap(declaration.initializer)))
  )
  if (!exported || !ts.isVariableStatement(exported)) throw new Error(`No exported dictionary in ${sourcePath}`)
  const declaration = exported.declarationList.declarations.find((item) =>
    ts.isObjectLiteralExpression(unwrap(item.initializer))
  )
  const object = unwrap(declaration.initializer)
  const dictionary = {}
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property)) throw new Error(`Unsupported dictionary member in ${sourcePath}`)
    const key = ts.isIdentifier(property.name) ? property.name.text :
      ts.isStringLiteral(property.name) || ts.isNumericLiteral(property.name) ? property.name.text : null
    const value = unwrap(property.initializer)
    if (key === null || (!ts.isStringLiteral(value) && !ts.isNoSubstitutionTemplateLiteral(value))) {
      throw new Error(`Non-literal translation value in ${sourcePath}`)
    }
    dictionary[key] = value.text
  }
  return dictionary
}

const locales = Object.fromEntries(
  readdirSync(localeDir).filter((name) => name.endsWith('.ts') && !['index.ts', 'direction.ts', 'interp.ts'].includes(name))
    .map((name) => [name.slice(0, -3), dictionaryFrom(join(localeDir, name))])
)
const referenceKeys = Object.keys(locales.en ?? {}).sort()
if (referenceKeys.length === 0) throw new Error('English dictionary not found')
for (const [locale, dictionary] of Object.entries(locales)) {
  const keys = Object.keys(dictionary).sort()
  if (keys.length !== referenceKeys.length || keys.some((key, index) => key !== referenceKeys[index])) {
    throw new Error(`${locale} dictionary does not match English key set`)
  }
}
writeFileSync(outputPath, `${JSON.stringify(locales)}\n`)
process.stdout.write(`Exported ${Object.keys(locales).length} locales × ${referenceKeys.length} keys to native/src/translations.json\n`)
