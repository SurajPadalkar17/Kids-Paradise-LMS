import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';

  return {
    base: isProduction ? '/' : '/',
    server: {
      host: "::",
      port: 8080,
      strictPort: true,
      hmr: {
        protocol: 'ws',
        host: 'localhost',
      },
    },
    preview: {
      port: 8080,
      strictPort: true,
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: isProduction ? false : 'inline',
      minify: isProduction ? 'esbuild' : false,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('@radix-ui')) {
                return 'radix';
              }
              if (id.includes('@tanstack') || id.includes('react-query')) {
                return 'react-query';
              }
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor';
              }
              return 'vendor';
            }
          },
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash][extname]',
        },
      },
      chunkSizeWarningLimit: 1000,
      target: 'esnext',
      modulePreload: {
        polyfill: false,
      },
      cssCodeSplit: true,
    },
    plugins: [
      react({
        // Enable React fast refresh
        jsxImportSource: 'react',
        // Use SWC for faster builds
        tsDecorators: true,
      }), 
      mode === "development" && componentTagger()
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
