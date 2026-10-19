import { defineConfig } from 'vite';
export default defineConfig({ root: 'demo', base: process.env.GITHUB_PAGES === 'true' ? '/react-mediaslide/' : '/', server: { host: '127.0.0.1', port: 4173, strictPort: true }, build: { outDir: '../demo-dist', emptyOutDir: true } });
