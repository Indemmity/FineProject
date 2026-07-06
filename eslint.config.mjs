// Root ESLint flat config for the job-application-platform monorepo.
// Web and service workspaces have their own lint setup (next lint, etc.).
// This config provides baseline rules for shared packages and ignores.

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/.venv/**',
      '**/.pytest_cache/**',
      '**/__pycache__/**',
      '**/uploads/**',
    ],
  },
];
