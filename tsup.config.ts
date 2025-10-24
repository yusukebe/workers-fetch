import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { cli: 'src/cli.ts' },
  format: ['esm'],
  dts: false,
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: ['wrangler', 'commander'],
})
