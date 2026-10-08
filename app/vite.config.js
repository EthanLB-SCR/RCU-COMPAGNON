import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
// Tampon de version affiché sur l'écran de connexion et dans le menu du compte : « jj/mm/aaaa · 6 hex ».
// L'empreinte ne dépend QUE du contenu des sources (src/* + index.html) → deux builds des mêmes sources le même jour sont identiques bit à bit.
const srcHash = () => { const h = createHash('md5'); readdirSync('src').sort().forEach(f => h.update(readFileSync('src/' + f))); h.update(readFileSync('index.html')); return h.digest('hex').slice(0, 6) }
const BUILD = (process.env.BUILD_DATE || new Date().toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' })) + ' · ' + srcHash()
export default defineConfig({ plugins: [viteSingleFile()], define: { __BUILD__: JSON.stringify(BUILD) }, build: { target: 'es2020', assetsInlineLimit: 100000000, cssCodeSplit: false, reportCompressedSize: false } })
