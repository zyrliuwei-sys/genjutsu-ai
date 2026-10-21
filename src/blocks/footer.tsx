import { m } from '@/paraglide/messages.js';
import { FooterBadgeList } from '@/components/footer-badge-list';
import { SiteFooter, type FooterColumn } from '@/components/site-footer';

export function Footer() {
  const columns: FooterColumn[] = [
    {
      title: m['landing.footer.product'](),
      hideOnMobile: true,
      links: [
        { label: m['landing.footer.video'](), href: '/create' },
        { label: m['flycar.nav'](), href: '/flying-car-ai' },
        { label: m['hotel.nav'](), href: '/hotel-lobby' },
        { label: m['ozil.nav'](), href: '/ozil-ai' },
        { label: m['frog.nav'](), href: '/crazy-frog-ai' },
        { label: m['landing.footer.image'](), href: '/genjutsu-video-ai' },
        { label: m['landing.nav.pricing'](), href: '/pricing' },
        { label: m['landing.footer.guide'](), href: '/#guide' },
      ],
    },
    {
      title: m['landing.footer.resources'](),
      hideOnMobile: true,
      links: [
        {
          label: 'support@genjutsu-ai.org',
          href: 'mailto:support@genjutsu-ai.org',
        },
      ],
    },
    {
      title: m['landing.footer.legal'](),
      links: [
        { label: m['landing.footer.privacy'](), href: '/privacy-policy' },
        { label: m['landing.footer.terms'](), href: '/terms-of-service' },
        { label: m['landing.footer.aup'](), href: '/aup' },
      ],
    },
  ];

  return (
    <SiteFooter
      tagline={m['landing.footer.tagline']()}
      columns={columns}
      badges={<FooterBadgeList className="mt-10" />}
    />
  );
}
