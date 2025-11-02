import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['server.ts'],
  format: ['esm'],
  target: 'node18',
  outDir: 'dist',
  bundle: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  external: ['@prisma/client', 'bcrypt', 'sharp'],
  noExternal: [],
  platform: 'node',
  treeshake: true,
  minify: false,
  dts: false,
});
