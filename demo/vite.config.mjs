import { defineConfig } from 'vite';
export default defineConfig({
  // The published component contains JSX in .js files. Transform only our source,
  // leaving dependencies and ordinary JavaScript to Vite's normal pipeline.
  plugins: [{
    name: 'mediaslide-jsx-in-js',
    enforce: 'pre',
    async transform(code, id) {
      if (!/[/\\]src[/\\]MediaSlide\.js(?:\?.*)?$/.test(id)) return null;
      const { transformWithEsbuild } = await import('vite');
      return transformWithEsbuild(code, id, { loader: 'jsx', jsx: 'automatic' });
    },
  }],
  optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
 root: 'demo', base: process.env.GITHUB_PAGES === 'true' ? '/react-mediaslide/' : '/', server: { host: '127.0.0.1', port: 4173, strictPort: true }, build: { outDir: '../demo-dist', emptyOutDir: true } });
