export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'ingestion',
        'processing',
        'graph',
        'embeddings',
        'query-engine',
        'agent-layer',
        'api',
        'infra',
        'shared',
        'jobs',
        'deps',
        'config',
      ],
    ],
  },
}
