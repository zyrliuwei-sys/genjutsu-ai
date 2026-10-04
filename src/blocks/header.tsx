import { m } from '@/paraglide/messages.js';
import { SiteHeader } from '@/components/site-header';

export function Header() {
  const navLinks = [
    { href: '/create', label: m['landing.nav.create']() },
    { href: '/#tools', label: m['landing.nav.features']() },
    { href: '/#about', label: m['landing.nav.about']() },
    { href: '/pricing', label: m['landing.nav.pricing']() },
  ];

  return <SiteHeader navLinks={navLinks} logoAlt={m['landing.logo_alt']()} />;
}
