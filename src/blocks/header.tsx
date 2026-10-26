import { m } from '@/paraglide/messages.js';
import { SiteHeader, type NavItem } from '@/components/site-header';

export function Header() {
  const navLinks: NavItem[] = [
    {
      label: m['landing.nav.trending'](),
      items: [
        {
          href: '/flying-car-ai',
          label: m['flycar.nav'](),
          description: m['landing.hero.flycar_tag'](),
          thumb: '/videos/flying-car/car.jpg',
        },
        {
          href: '/ozil-ai',
          label: m['ozil.nav'](),
          description: m['landing.hero.ozil_tag'](),
          thumb: '/videos/ozil/red-hoodie.jpg',
        },
        {
          href: '/crazy-frog-ai',
          label: m['frog.nav'](),
          description: m['landing.hero.frog_tag'](),
          thumb: '/videos/crazy-frog/neon-city.jpg',
        },
        {
          href: '/bulin-47-ai',
          label: m['bulin.nav'](),
          description: m['landing.hero.bulin_tag'](),
          thumb: '/videos/bulin/cap.jpg',
        },
      ],
    },
    { href: '/create', label: m['landing.nav.create']() },
    { href: '/genjutsu-video-ai', label: m['landing.nav.features']() },
    {
      href: '/higgsfield-genjutsu-alternative',
      label: m['landing.resources.compare_nav'](),
    },
    { href: '/guides', label: m['guides.title']() },
    { href: '/pricing', label: m['landing.nav.pricing']() },
  ];

  return <SiteHeader navLinks={navLinks} logoAlt={m['landing.logo_alt']()} />;
}
