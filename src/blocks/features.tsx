import { ArrowUpRight } from 'lucide-react';

import { tDynamic } from '@/core/i18n/dynamic';
import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { LoopVideo } from '@/components/loop-video';
import { Reveal } from '@/components/reveal';

const AD_PROMPT =
  'Turn this product into a 9:16 ad: a quick hook in the first second, close-up hero shots, a happy customer using it, bright commercial lighting';
const SHORTS_PROMPT =
  'Vertical short: a dramatic "you won\'t believe this" reveal, fast cuts, handheld phone camera, viral TikTok style';

const TOOLS: Array<{
  key: string;
  image: string;
  video?: string;
  href: string;
}> = [
  {
    key: 'video',
    image: '/videos/higgsfield-reference/motion.webp',
    video: '/videos/higgsfield-reference/motion.mp4',
    href: '/create?kind=video',
  },
  {
    key: 'image',
    image: '/videos/higgsfield-reference/feature-3-2.webp',
    video: '/videos/higgsfield-reference/feature-3-2.mp4',
    href: '/create?kind=video',
  },
  {
    key: 'ads',
    image: '/videos/higgsfield-reference/feature-3-1.webp',
    video: '/videos/higgsfield-reference/feature-3-1.mp4',
    href: `/create?kind=video&prompt=${encodeURIComponent(AD_PROMPT)}`,
  },
  {
    key: 'shorts',
    image: '/videos/higgsfield-reference/feature-1-2.webp',
    video: '/videos/higgsfield-reference/feature-1-2.mp4',
    href: `/create?kind=video&prompt=${encodeURIComponent(SHORTS_PROMPT)}`,
  },
] as const;

/** The four studios, shown as widescreen stills in an editorial 2x2. */
export function Features() {
  return (
    <section
      id="tools"
      className="border-border scroll-mt-20 border-t px-4 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <h2 className="eg-heading max-w-xl text-4xl leading-[1.05] sm:text-5xl">
            {m['landing.tools.title']()}
          </h2>
          <p className="text-muted-foreground max-w-md text-lg leading-relaxed lg:justify-self-end">
            {m['landing.tools.description']()}
          </p>
        </Reveal>
        <div className="mt-16 grid gap-x-10 gap-y-14 md:grid-cols-2">
          {TOOLS.map((tool, i) => (
            <Reveal key={tool.key} delay={(i % 2) * 90}>
              <Link href={tool.href} className="group block">
                <div className="eg-screen relative aspect-[21/9] overflow-hidden rounded-md">
                  {tool.video ? (
                    <LoopVideo
                      src={tool.video}
                      poster={tool.image}
                      label={tDynamic(`landing.tools.${tool.key}.title`)}
                      width={1024}
                      height={439}
                      className="size-full opacity-90 transition duration-700 group-hover:scale-[1.03] group-hover:opacity-100"
                    />
                  ) : (
                    <img
                      src={tool.image}
                      alt={tDynamic(`landing.tools.${tool.key}.title`)}
                      width={1024}
                      height={529}
                      loading="lazy"
                      className="size-full object-cover object-top opacity-90 transition duration-700 group-hover:scale-[1.03] group-hover:opacity-100"
                    />
                  )}
                </div>
                <p className="eg-eyebrow mt-6">
                  {tDynamic(`landing.tools.${tool.key}.tag`)}
                </p>
                <h3 className="eg-heading mt-2 flex items-center gap-3 text-3xl">
                  {tDynamic(`landing.tools.${tool.key}.title`)}
                  <ArrowUpRight className="text-primary size-5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
                </h3>
                <p className="text-muted-foreground mt-2 max-w-md leading-relaxed">
                  {tDynamic(`landing.tools.${tool.key}.description`)}
                </p>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
