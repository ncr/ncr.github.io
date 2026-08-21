// Reads Omarchy theme palettes from a local Omarchy install and emits:
//   src/data/omarchy-themes.json  (names + modes, for the <select>)
//   public/themes.css             (one :root[data-theme=...] block per theme)
// Run manually after an Omarchy update: node scripts/build-themes.mjs
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const THEMES_DIR = join(process.env.HOME, '.local/share/omarchy/themes')

const parse = toml => {
  const out = {}
  for (const line of toml.split('\n')) {
    const m = line.match(/^(\w+)\s*=\s*"([^"]+)"/)
    if (m) out[m[1]] = m[2]
  }
  return out
}

const themes = []
for (const name of readdirSync(THEMES_DIR).sort()) {
  const file = join(THEMES_DIR, name, 'colors.toml')
  if (!existsSync(file)) continue
  const c = parse(readFileSync(file, 'utf8'))
  if (!c.background || !c.foreground) continue
  const dark = c.mode !== 'light'
  themes.push({
    name,
    mode: dark ? 'dark' : 'light',
    tokens: {
      bg: c.background,
      fg: c.foreground,
      muted: c.dark_foreground || c.muted,
      link: c.accent || c.blue,
      hairline: c.selection || c.lighter_background,
      'code-bg': dark ? (c.lighter_background || c.dark_background) : (c.dark_background || c.lighter_background),
    },
  })
}

const css = [
  '/* Generated from Omarchy themes by scripts/build-themes.mjs — do not edit by hand. */',
  ...themes.map(t => {
    const vars = Object.entries(t.tokens).map(([k, v]) => `  --${k}: ${v};`).join('\n')
    return `:root[data-theme="${t.name}"] {\n${vars}\n  color-scheme: ${t.mode};\n}`
  }),
].join('\n\n') + '\n'

writeFileSync('public/themes.css', css)
writeFileSync('src/data/omarchy-themes.json', JSON.stringify(themes.map(({ name, mode }) => ({ name, mode })), null, 2))
console.log(`${themes.length} themes`)
