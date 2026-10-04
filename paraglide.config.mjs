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
      localized: [['en', '/api/:path(.*)?']],
    },
    {
      pattern: '/',
      localized: [['en', '/']],
    },
    {
      pattern: '/:path(.*)?',
      localized: [['en', '/:path(.*)?']],
    },
  ],
};
