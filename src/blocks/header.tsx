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
        {
          href: '/pollo-ai-kissing',
          label: m['kiss.nav'](),
          description: m['landing.hero.kiss_tag'](),
          thumb: '/videos/pollo-kissing/spring-park.jpg',
        },
        {
          href: '/burning-bridges-ai',
          label: m['bridges.nav'](),
          description: m['landing.hero.bridges_tag'](),
          thumb: '/videos/burning-bridges/black-tee.jpg',
        },
        {
          href: '/dame-hombro-ai',
          label: m['hombro.nav'](),
          description: m['landing.hero.hombro_tag'](),
          thumb: '/videos/dame-hombro/crowd.jpg',
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
