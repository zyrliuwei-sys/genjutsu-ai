import { compile } from '@inlang/paraglide-js';

import { paraglideConfig } from '../paraglide.config.mjs';

await compile({
  ...paraglideConfig,
  isServer: "import.meta.env?.SSR ?? typeof window === 'undefined'",
  cleanOutdir: false,
});
