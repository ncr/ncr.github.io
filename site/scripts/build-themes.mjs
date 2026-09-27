// Reads Omarchy theme palettes from a local Omarchy install and emits:
//   src/data/omarchy-themes.json  (names + modes + swatch colours, for the theme picker)
//   public/themes.css             (one :root[data-theme=...] block per theme)
// Run manually after an Omarchy update: node scripts/build-themes.mjs
//
// PINNED themes come first and are not read from the Omarchy install:
//   p-bloom — the site default (same values as :root in public/styles.css),
//             from ~/dev/omarchy-destiny-theme/colors.toml. muted is
//             dark_foreground (5.5:1 on the ground), code-bg lighter_background.
//   classic — the site's original light look (white, near-black, blue links).
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

const PINNED = [
  {
    name: 'p-bloom', label: 'p(bloom)', mode: 'dark',
    tokens: { bg: '#090d16', fg: '#d9e8ff', muted: '#7389ad', link: '#4cc9ff', hairline: '#1f3a5f', 'code-bg': '#121a2a' },
  },
  {
    name: 'classic', label: 'classic', mode: 'light',
    tokens: { bg: '#ffffff', fg: '#1c1c1c', muted: '#6f6f6f', link: '#0044cc', hairline: '#e2e2e2', 'code-bg': '#f4f4f4' },
  },
]

const themes = [...PINNED]
for (const name of readdirSync(THEMES_DIR).sort()) {
  if (PINNED.some(t => t.name === name)) continue
  const file = join(THEMES_DIR, name, 'colors.toml')
  if (!existsSync(file)) continue
  const c = parse(readFileSync(file, 'utf8'))
  if (!c.background || !c.foreground) continue
  const dark = c.mode !== 'light'
  themes.push({
    name,
    label: name,
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
writeFileSync('src/data/omarchy-themes.json', JSON.stringify(themes.map(t => ({ name: t.name, label: t.label, mode: t.mode, bg: t.tokens.bg, accent: t.tokens.link })), null, 2))
console.log(`${themes.length} themes`)
