# Reference video replacement

Scope: replace ALL static demo videos and matching video posters across the site.
Use the ten distinct public videos exposed on the source page. Since there are
more local template cards than source clips, remove duplicate sample cards;
never fall back to an earlier generated or stock demo clip. Preserve card names,
copy, layout, generation APIs and user-uploaded/generated work. Keep the original
three-item rotation (STORM, Smalltown Boy, Burning Bridges); other selected
templates loop their reference clip. Select Effect contains ten unique clips.
Replace the image-tool static illustration with an original reference poster.
Keep layout, labels, upload/generation APIs and the three-item autoplay behavior.
Source: https://higgsfield.ai/genjutsu, public video elements observed in browser.

| Existing card   | Public source path under static.higgsfield.ai | Local asset |
| --------------- | --------------------------------------------- | ----------- |
| Genjutsu STORM  | genjutus-fixes/hero/itemv.mp4                 | crowd.mp4   |
| Smalltown Boy   | reality-manipulation/features/feature-2-2.mp4 | dream.mp4   |
| Burning Bridges | reality-manipulation/features/feature-1-3.mp4 | motion.mp4  |

Each poster is the original `-poster.webp` alongside the corresponding source.
Local directory: `public/videos/higgsfield-reference/`.
Interaction: play to end, advance to next item, wrap from third to first.
Video display: object-fit cover; preserve the current responsive container.
Update displayed duration and ratio from ffprobe, not the earlier generated clips.
Do not remove original markings, bypass access controls, or imply ownership.
Publicly reachable URLs do not establish commercial reuse rights; no deployment.
Record source URLs, hashes, sizes and measured dimensions in sources.json.
