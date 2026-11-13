import { tDynamic } from '@/core/i18n/dynamic';
import {
  SHERU_GUIDE_PATH,
  TREND_HUB_LABEL,
  TREND_HUB_PATH,
  TREND_PAGES,
} from '@/config/trends';
import { m } from '@/paraglide/messages.js';
import { localizeHref } from '@/paraglide/runtime.js';
import { TrendLinkGrid } from '@/components/trend-link-grid';

export function TrendingEffects() {
  return (
    <>
      <TrendLinkGrid
        id="trending-ai-video-effects"
        title={m['landing.trends.title']()}
        description={m['landing.trends.description']()}
        items={TREND_PAGES.map((trend) => ({
          href: localizeHref(`/${trend.slug}`),
          label: tDynamic(`${trend.key}.nav`),
          description: tDynamic(
            trend.key === 'dime'
              ? 'dime.nav_description'
              : `landing.hero.${trend.key}_tag`
          ),
          image: trend.image,
        }))}
      />
      <p className="mx-auto flex max-w-7xl flex-wrap gap-x-8 gap-y-3 px-4 pb-10">
        <a
          href={TREND_HUB_PATH}
          className="text-primary font-medium underline underline-offset-4"
        >
          {TREND_HUB_LABEL} →
        </a>
        <a
          href={SHERU_GUIDE_PATH}
          className="text-primary font-medium underline underline-offset-4"
        >
          {m['landing.trends.sheru_guide']()}
        </a>
      </p>
    </>
  );
}
