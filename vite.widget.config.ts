import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Widget-specific build configuration
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-widget',
    lib: {
      entry: path.resolve(__dirname, 'src/widget/widget.tsx'),
      name: 'PBMPChatWidget',
      fileName: 'pbmp-chat-widget',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        // Inline all dependencies for standalone widget
        inlineDynamicImports: true,
        // Ensure single file output
        format: 'iife',
        name: 'PBMPChatWidget',
        // Output filename without .iife extension
        entryFileNames: 'pbmp-chat-widget.js',
        // Include CSS in the bundle
        assetFileNames: 'pbmp-chat-widget.[ext]'
      },
      external: []
    },
    sourcemap: false,
    minify: 'esbuild', // Use esbuild (built-in, faster than terser)
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
})
