// Maquette « traceur » : page seule, construite à part (vite-plugin-singlefile n'accepte qu'une entrée par build)
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { resolve } from 'path'
export default defineConfig({ plugins: [viteSingleFile()], root: resolve(__dirname, 'maquette'), build: { target: 'es2020', assetsInlineLimit: 100000000, cssCodeSplit: false, reportCompressedSize: false, outDir: resolve(__dirname, 'dist-maquette'), emptyOutDir: true } })
