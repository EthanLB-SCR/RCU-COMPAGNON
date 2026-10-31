import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
// Tampon de version affiché sur l'écran de connexion et dans le menu du compte : « jj/mm/aaaa · 6 hex ».
// L'empreinte ne dépend QUE du contenu des sources (src/* + index.html) → deux builds des mêmes sources le même jour sont identiques bit à bit.
const srcHash = () => { const h = createHash('md5'); readdirSync('src').sort().forEach(f => h.update(readFileSync('src/' + f))); h.update(readFileSync('index.html')); return h.digest('hex').slice(0, 6) }
const BUILD = (process.env.BUILD_DATE || new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })) + ' · ' + srcHash()
// 31/10 (lot MO, charte « Tracé ») : le gros script inline (≈ 4,9 Mo) passe en FIN de <body> → l'écran de chargement (en tête de <body>) s'affiche pendant qu'il arrive.
// Un <script type="module"> est différé où qu'il soit : il s'exécute toujours après la lecture complète du document (rien ne change pour l'appli).
const scriptEnFin = () => ({ name: 'trace-script-en-fin', enforce: 'post', generateBundle(_, bundle) { for (const f of Object.values(bundle)) { if (f.type !== 'asset' || !/\.html$/.test(f.fileName)) continue; const s = String(f.source); const a = s.indexOf('<script type="module"'); const b = a < 0 ? -1 : s.indexOf('</script>', a); if (b < 0) continue; const tag = s.slice(a, b + 9), rest = s.slice(0, a) + s.slice(b + 9); const e = rest.lastIndexOf('</body>'); if (e < 0) continue; f.source = rest.slice(0, e) + tag + '\n' + rest.slice(e) } } })
export default defineConfig({ plugins: [viteSingleFile(), scriptEnFin()], define: { __BUILD__: JSON.stringify(BUILD) }, build: { target: 'es2020', assetsInlineLimit: 100000000, cssCodeSplit: false, reportCompressedSize: false } })
