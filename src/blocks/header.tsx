import { m } from '@/paraglide/messages.js';
import { SiteHeader } from '@/components/site-header';

export function Header() {
  const navLinks = [
    { href: '/create', label: m['landing.nav.create']() },
    { href: '/hotel-lobby', label: m['hotel.nav']() },
    { href: '/ozil-ai', label: m['ozil.nav']() },
    { href: '/crazy-frog-ai', label: m['frog.nav']() },
    { href: '/genjutsu-video-ai', label: m['landing.nav.features']() },
    {
      href: '/higgsfield-genjutsu-alternative',
      label: m['landing.resources.compare_nav'](),
    },
    { href: '/pricing', label: m['landing.nav.pricing']() },
  ];

  return <SiteHeader navLinks={navLinks} logoAlt={m['landing.logo_alt']()} />;
}
