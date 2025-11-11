import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-plugin-prettier/recommended';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig(
  globalIgnores(['node_modules/**', 'dist/**', 'eslint.config.js', 'prettier.config.js', 'vitest.config.ts']),
  {
    name: 'nodeConfig',
    files: ['src/**/*.{ts,js}'],
    extends: [js.configs.recommended, tseslint.configs.strictTypeChecked, prettier],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.node, ...globals.jest },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: {
      noInlineConfig: true,
    },
  },
);
