import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    outDir: 'wordpress/mediaslide/assets',
    emptyOutDir: false,
    lib: { entry: 'wordpress/mediaslide/src/view.jsx', formats: ['iife'], name: 'MediaSlideWordPress', fileName: () => 'mediaslide.js' },
    cssCodeSplit: false,
    rollupOptions: { output: { assetFileNames: () => 'mediaslide.css' } }
  },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
});
