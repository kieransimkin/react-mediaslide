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

  build: {
    outDir: 'wordpress/mediaslide/assets',
    emptyOutDir: false,
    lib: { entry: 'wordpress/mediaslide/src/view.jsx', formats: ['iife'], name: 'MediaSlideWordPress', fileName: () => 'mediaslide.js' },
    cssCodeSplit: false,
    rollupOptions: { output: { assetFileNames: () => 'mediaslide.css' } }
  },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
});
