// Checkout follows the language selected on the site, not the browser's
// Accept-Language header. Unknown or missing values use the site's English base.
export type CheckoutLocale = 'en' | 'de' | 'fr' | 'es' | 'pt-BR';

export function normalizeCheckoutLocale(value: unknown): CheckoutLocale {
  if (typeof value !== 'string') return 'en';
  switch (value.trim().toLowerCase()) {
    case 'de':
      return 'de';
    case 'fr':
      return 'fr';
    case 'es':
      return 'es';
    case 'pt-br':
      return 'pt-BR';
    default:
      return 'en';
  }
}

export function paypalCheckoutLocale(value: unknown) {
  const locales = {
    en: 'en-US',
    de: 'de-DE',
    fr: 'fr-FR',
    es: 'es-ES',
    'pt-BR': 'pt-BR',
  } as const;
  return locales[normalizeCheckoutLocale(value)];
}

export function waffoCheckoutLanguage(value: unknown) {
  // Pancake's CashierLanguage supports Brazilian Portuguese and Mexican
  // Spanish, but not German or French. Use English for unsupported languages.
  const languages = {
    en: 'en',
    de: 'en',
    fr: 'en',
    es: 'es-MX',
    'pt-BR': 'pt-BR',
  } as const;
  return languages[normalizeCheckoutLocale(value)];
}
