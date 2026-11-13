import { tDynamic } from '@/core/i18n/dynamic';
import {
  FLOOR_GUIDE_PATH,
  RELATED_TRENDS,
  SHERU_GUIDE_PATH,
  TREND_HUB_LABEL,
  TREND_HUB_PATH,
  TREND_PAGES,
  type TrendSlug,
} from '@/config/trends';
import { m } from '@/paraglide/messages.js';
import { localizeHref } from '@/paraglide/runtime.js';
import { TrendLinkGrid } from '@/components/trend-link-grid';

export function RelatedTrends({ currentSlug }: { currentSlug: TrendSlug }) {
  return (
    <>
      <TrendLinkGrid
        id="related-trends"
        title={m['landing.trends.related_title']()}
        items={[
          {
            href: TREND_HUB_PATH,
            label: TREND_HUB_LABEL,
            description: 'Explore trends, photo tips and templates.',
            image: '/videos/dime-dime-baby/black-shirt.jpg',
          },
          ...RELATED_TRENDS[currentSlug].map((slug) => {
            const trend = TREND_PAGES.find((item) => item.slug === slug)!;
            return {
              href: localizeHref(`/${trend.slug}`),
              label: tDynamic(`${trend.key}.nav`),
              description: tDynamic(
                trend.key === 'dime'
                  ? 'dime.nav_description'
                  : `landing.hero.${trend.key}_tag`
              ),
              image: trend.image,
            };
          }),
        ]}
      />
      <div className="mx-auto flex max-w-7xl flex-wrap gap-x-8 gap-y-3 px-4 pb-12">
        <a
          href={TREND_HUB_PATH}
          className="text-primary text-sm font-medium underline underline-offset-4"
        >
          {TREND_HUB_LABEL}
        </a>
        {['tiny-desk-ai', 'bulin-47-ai', 'burning-bridges-ai'].includes(
          currentSlug
        ) && (
          <a
            href={FLOOR_GUIDE_PATH}
            className="text-primary text-sm font-medium underline underline-offset-4"
          >
            {m['landing.trends.floor_guide']()}
          </a>
        )}
        {['hit-the-road-dude-ai', 'crazy-frog-ai', 'flying-car-ai'].includes(
          currentSlug
        ) && (
          <a
            href={SHERU_GUIDE_PATH}
            className="text-primary text-sm font-medium underline underline-offset-4"
          >
            {m['landing.trends.sheru_guide']()}
          </a>
        )}
      </div>
    </>
  );
}
