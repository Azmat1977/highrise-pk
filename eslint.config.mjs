import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  {
    rules: {
      // Production correctness blockers
      'react-hooks/rules-of-hooks': 'error',
      'react/jsx-key': 'error',

      // Existing technical debt: report during normal lint,
      // but do not prevent production certification.
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/no-unescaped-entities': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@next/next/no-html-link-for-pages': 'warn',
      'prefer-const': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
    },
  },

{
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'next-env.d.ts',
      'public/uploads/**',
      '.highrise-backups/**',
      '_backup_v641_cleanup/**',
      'highrise-homepage-reference/**',
      'highrise-auth-foundation/**',
      'highrise-signup-verification-v1/**',
      'highrise-trusted-auth-sessions/**',
      'highrise-trusted-auth-sessions-v2/**',
      '.agents/**',
      '.claude/**',
    ],
  },
];

export default eslintConfig;
