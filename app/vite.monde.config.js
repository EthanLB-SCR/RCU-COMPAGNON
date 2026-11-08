// Prototype jouable du Monde 3D (nuit du 07 au 08/11/2026) : page seule, données fictives, construite à part → dist-monde/index.html
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { resolve } from 'path'
export default defineConfig({ plugins: [viteSingleFile()], root: resolve(__dirname, 'proto'), build: { target: 'es2020', assetsInlineLimit: 100000000, cssCodeSplit: false, reportCompressedSize: false, outDir: resolve(__dirname, 'dist-monde'), emptyOutDir: true } })
