# ESLint 9 Configuration (Flat Config)

ESLint 9.18+ supports TypeScript config files natively with `jiti`. Use `eslint.config.ts` for type safety.

## eslint.config.ts

```typescript
// @ts-check
import { defineConfig, globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

export default defineConfig(
  // Global ignores
  globalIgnores(['dist/', 'node_modules/', 'coverage/', '*.config.js']),

  // Base configs
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  // TypeScript + React setup
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // TypeScript
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],
    },
  },

  // Disable type checking for JS files
  {
    files: ['**/*.js', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // Disable formatting rules (handled by Prettier)
  prettier
)
```

## Dependencies

```bash
pnpm add -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-react-refresh eslint-config-prettier globals jiti
```

Note: `jiti` is required for TypeScript config file support in Node.js < 22.10.

## Alternative: Minimal Config

For simpler projects without strict type checking:

```typescript
import { defineConfig, globalIgnores } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettier from 'eslint-config-prettier'

export default defineConfig(
  globalIgnores(['dist/']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  prettier
)
```

## Key Features (2025)

| Feature | Description |
|---------|-------------|
| `defineConfig()` | Type-safe config helper, auto-flattens arrays |
| `globalIgnores()` | Explicit global ignore patterns |
| `eslint.config.ts` | Native TS support (requires jiti or Node 22.10+) |
| `projectService` | Stable typed linting via TS language service |
| `disableTypeChecked` | Disable type rules for JS files |
