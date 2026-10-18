/** @type {import('@inlang/paraglide-js').CompilerOptions} */
export const paraglideConfig = {
  project: './project.inlang',
  outdir: './src/paraglide',
  outputStructure: 'message-modules',
  cookieName: 'PARAGLIDE_LOCALE',
  strategy: ['url', 'cookie', 'baseLocale'],
  urlPatterns: [
    {
      pattern: '/api/:path(.*)?',
      localized: [
        ['en', '/api/:path(.*)?'],
        ['de', '/api/:path(.*)?'],
        ['fr', '/api/:path(.*)?'],
        ['es', '/api/:path(.*)?'],
        ['pt-BR', '/api/:path(.*)?'],
      ],
    },
    {
      pattern: '/',
      localized: [
        ['de', '/de'],
        ['fr', '/fr'],
        ['es', '/es'],
        ['pt-BR', '/pt-br'],
        ['en', '/'],
      ],
    },
    {
      pattern: '/:path(.*)?',
      localized: [
        ['de', '/de/:path(.*)?'],
        ['fr', '/fr/:path(.*)?'],
        ['es', '/es/:path(.*)?'],
        ['pt-BR', '/pt-br/:path(.*)?'],
        ['en', '/:path(.*)?'],
      ],
    },
  ],
};
