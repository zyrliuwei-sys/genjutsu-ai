import { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, Upload, X } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { SiteUserMenu } from '@/components/site-user-menu';

import '@/styles/hotel-lobby.css';

const heroImage = '/imgs/generated/hotel-lobby-duet.png';
const mobileHeroImage = '/imgs/generated/duet-hero-mobile.jpg';
const previewImage = '/imgs/generated/duet-scene-preview.jpg';
const friendsImage = '/imgs/generated/duet-friends.jpg';
const siblingsImage = '/imgs/generated/duet-siblings.jpg';
const coupleImage = '/imgs/generated/duet-couple.jpg';
const basePrompt =
  'Turn TWO separate authorized adult portraits into a vertical 9:16 duet in a warm matte-orange recording booth. Preserve both faces and outfits. Keep person A full body on the LEFT and person B full body on the RIGHT, with one black microphone hanging at center. Person A performs first while B reacts, then switch. Use a locked centered camera, soft even light and restrained natural gestures. No face blending, side swaps, extra people, cuts, zooms, captions, logos or watermarks.';

function PhotoInput({
  label,
  side,
  onFile,
}: {
  label: string;
  side: string;
  onFile: (file: File | null) => void;
}) {
  const [preview, setPreview] = useState<string>();
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );
  return (
    <label className="hl-upload">
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          if (file && file.size > 10 * 1024 * 1024) {
            alert(m['hotel.upload_limit']());
            e.target.value = '';
            return;
          }
          setPreview(file ? URL.createObjectURL(file) : undefined);
          onFile(file);
        }}
      />
      {preview ? (
        <img src={preview} alt={label} className="hl-upload-preview" />
      ) : (
        <Upload size={24} strokeWidth={1.5} />
      )}
      <span>{label}</span>
      <small>{side}</small>
    </label>
  );
}

export function HotelLobbyPage() {
  const [photoA, setPhotoA] = useState<File | null>(null);
  const [photoB, setPhotoB] = useState<File | null>(null);
  const [direction, setDirection] = useState('');
  const [copied, setCopied] = useState(false);
  const [consent, setConsent] = useState(false);
  const [menu, setMenu] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;
  const canOpen = consent && !!photoA && !!photoB;
  const prompt = `${basePrompt}${direction.trim() ? ` Additional direction: ${direction.trim().slice(0, 400)}.` : ''}`;
  const generatorUrl = `https://dreamina.capcut.com/ai-tool/home?need_login=true&type=video&prompt=${encodeURIComponent(prompt)}`;
  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="hotel-page">
      <header className="hl-header">
        <Link href="/" className="hl-brand">
          <img
            src={envConfigs.app_logo}
            alt={m['hotel.logo_alt']()}
            width={512}
            height={512}
            className="hl-brand-mark"
          />
          <span>{envConfigs.app_name}</span>
        </Link>
        <nav
          className={menu ? 'hl-nav hl-nav-open' : 'hl-nav'}
          aria-label={m['hotel.nav_label']()}
        >
          <a href="#create" onClick={() => setMenu(false)}>
            {m['hotel.nav.create']()}
          </a>
          <a href="#how" onClick={() => setMenu(false)}>
            {m['hotel.nav.how']()}
          </a>
          <a href="#ideas" onClick={() => setMenu(false)}>
            {m['hotel.nav.ideas']()}
          </a>
          <a href="#faq" onClick={() => setMenu(false)}>
            {m['hotel.nav.faq']()}
          </a>
        </nav>
        <div className="hl-header-actions">
          {user ? (
            <SiteUserMenu
              name={user.name || user.email}
              email={user.email}
              image={user.image}
            />
          ) : (
            <Link className="hl-nav-cta" href="/sign-in">
              {m['common.sign.sign_in_title']()} <ArrowRight size={16} />
            </Link>
          )}
          <button
            className="hl-menu"
            onClick={() => setMenu(!menu)}
            aria-label={m['hotel.nav_label']()}
          >
            {menu ? <X /> : <span>☰</span>}
          </button>
        </div>
      </header>

      <main>
        <section className="hl-hero">
          <div className="hl-hero-frame">
            <picture>
              <source media="(max-width: 600px)" srcSet={mobileHeroImage} />
              <img
                src={heroImage}
                alt={m['hotel.hero.image_alt']()}
                width={1672}
                height={941}
                fetchPriority="high"
              />
            </picture>
          </div>
          <div className="hl-hero-copy">
            <p className="hl-kicker">{m['hotel.hero.eyebrow']()}</p>
            <h1>{m['hotel.hero.title']()}</h1>
            <p className="hl-subtitle">{m['hotel.hero.subtitle']()}</p>
            <a href="#create" className="hl-button">
              {m['hotel.hero.cta']()} <ArrowRight size={18} />
            </a>
          </div>
        </section>

        <section className="hl-explainer" aria-labelledby="filter-heading">
          <div className="hl-section-intro">
            <p className="hl-kicker">{m['hotel.explainer.eyebrow']()}</p>
            <h2 id="filter-heading">{m['hotel.explainer.title']()}</h2>
          </div>
          <div className="hl-prose">
            <p>{m['hotel.explainer.one']()}</p>
            <p>{m['hotel.explainer.two']()}</p>
            <p>{m['hotel.explainer.three']()}</p>
          </div>
        </section>

        <section id="create" className="hl-create">
          <div className="hl-section-intro">
            <p className="hl-kicker">{m['hotel.create.eyebrow']()}</p>
            <h2>{m['hotel.create.title']()}</h2>
            <p>{m['hotel.create.description']()}</p>
          </div>
          <div className="hl-create-grid">
            <div className="hl-create-form">
              <div className="hl-form-top">
                <span className="hl-step">{m['hotel.create.photos']()}</span>
                <span>{m['hotel.create.format']()}</span>
              </div>
              <div className="hl-upload-grid">
                <PhotoInput
                  label={m['hotel.create.person_a']()}
                  side={m['hotel.create.left']()}
                  onFile={setPhotoA}
                />
                <PhotoInput
                  label={m['hotel.create.person_b']()}
                  side={m['hotel.create.right']()}
                  onFile={setPhotoB}
                />
              </div>
              <label className="hl-field-label" htmlFor="direction">
                {m['hotel.create.direction']()}
              </label>
              <textarea
                id="direction"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                maxLength={400}
                placeholder={m['hotel.create.placeholder']()}
              />
              <p className="hl-starter-label">
                {m['hotel.create.starter_label']()}
              </p>
              <pre className="hl-starter-prompt">{basePrompt}</pre>
              <label className="hl-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>{m['hotel.create.consent']()}</span>
              </label>
              <div className="hl-form-actions">
                <button
                  className="hl-button"
                  type="button"
                  onClick={copyPrompt}
                >
                  {copied ? <Check size={17} /> : <Copy size={17} />}{' '}
                  {copied
                    ? m['hotel.create.copied']()
                    : m['hotel.create.copy']()}
                </button>
                <a
                  className={`hl-outline ${!canOpen ? 'hl-disabled' : ''}`}
                  href={canOpen ? generatorUrl : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!canOpen}
                  onClick={(e) => {
                    if (!canOpen) e.preventDefault();
                  }}
                >
                  {m['hotel.create.open']()} <ArrowRight size={17} />
                </a>
              </div>
              <p className="hl-hint">
                {photoA && photoB
                  ? m['hotel.create.ready']()
                  : m['hotel.create.hint']()}
              </p>
            </div>
            <aside className="hl-preview">
              <div className="hl-preview-media">
                <img
                  src={previewImage}
                  alt={m['hotel.hero.image_alt']()}
                  width={1024}
                  height={1536}
                />
              </div>
              <div className="hl-preview-caption">
                <span>{m['hotel.create.preview']()}</span>
                <span>{m['hotel.create.duet']()}</span>
              </div>
              <p>{m['hotel.create.preview_note']()}</p>
            </aside>
          </div>
        </section>

        <section id="how" className="hl-how">
          <div className="hl-section-intro">
            <p className="hl-kicker">{m['hotel.how.eyebrow']()}</p>
            <h2>{m['hotel.how.title']()}</h2>
          </div>
          <div className="hl-how-grid">
            <article>
              <h3>{m['hotel.how.one.title']()}</h3>
              <p>{m['hotel.how.one.text']()}</p>
            </article>
            <article>
              <h3>{m['hotel.how.two.title']()}</h3>
              <p>{m['hotel.how.two.text']()}</p>
            </article>
            <article>
              <h3>{m['hotel.how.three.title']()}</h3>
              <p>{m['hotel.how.three.text']()}</p>
            </article>
          </div>
        </section>

        <section id="ideas" className="hl-ideas">
          <div className="hl-section-intro">
            <p className="hl-kicker">{m['hotel.ideas.eyebrow']()}</p>
            <h2>{m['hotel.ideas.title']()}</h2>
            <p>{m['hotel.ideas.description']()}</p>
          </div>
          <div className="hl-ideas-grid">
            <article>
              <img
                src={friendsImage}
                alt={m['hotel.ideas.image_alt']()}
                width={1536}
                height={1024}
                loading="lazy"
              />
              <h3>{m['hotel.ideas.friends.title']()}</h3>
              <p>{m['hotel.ideas.friends.text']()}</p>
            </article>
            <article>
              <img
                src={siblingsImage}
                alt={m['hotel.ideas.siblings.image_alt']()}
                width={1536}
                height={1024}
                loading="lazy"
              />
              <h3>{m['hotel.ideas.siblings.title']()}</h3>
              <p>{m['hotel.ideas.siblings.text']()}</p>
            </article>
            <article>
              <img
                src={coupleImage}
                alt={m['hotel.ideas.couples.image_alt']()}
                width={1536}
                height={1024}
                loading="lazy"
              />
              <h3>{m['hotel.ideas.couples.title']()}</h3>
              <p>{m['hotel.ideas.couples.text']()}</p>
            </article>
          </div>
        </section>

        <section className="hl-guide" aria-labelledby="guide-heading">
          <div className="hl-section-intro">
            <p className="hl-kicker">{m['hotel.guide.eyebrow']()}</p>
            <h2 id="guide-heading">{m['hotel.guide.title']()}</h2>
            <p>{m['hotel.guide.intro']()}</p>
          </div>
          <div className="hl-guide-grid">
            <article>
              <span>01</span>
              <h3>{m['hotel.guide.photos.title']()}</h3>
              <p>{m['hotel.guide.photos.text']()}</p>
            </article>
            <article>
              <span>02</span>
              <h3>{m['hotel.guide.motion.title']()}</h3>
              <p>{m['hotel.guide.motion.text']()}</p>
            </article>
            <article>
              <span>03</span>
              <h3>{m['hotel.guide.review.title']()}</h3>
              <p>{m['hotel.guide.review.text']()}</p>
            </article>
          </div>
        </section>

        <section className="hl-prompt-guide" aria-labelledby="prompt-heading">
          <div className="hl-section-intro">
            <p className="hl-kicker">{m['hotel.prompt.eyebrow']()}</p>
            <h2 id="prompt-heading">{m['hotel.prompt.title']()}</h2>
            <div className="hl-prompt-ratio" aria-hidden="true">
              <span>9:16</span>
            </div>
          </div>
          <div className="hl-prose">
            <p>{m['hotel.prompt.one']()}</p>
            <p>{m['hotel.prompt.two']()}</p>
          </div>
        </section>

        <section id="faq" className="hl-faq" aria-labelledby="faq-heading">
          <div className="hl-section-intro">
            <p className="hl-kicker">{m['hotel.faq.eyebrow']()}</p>
            <h2 id="faq-heading">{m['hotel.faq.title']()}</h2>
          </div>
          <div className="hl-faq-list">
            {(
              [
                'one',
                'two',
                'three',
                'four',
                'five',
                'six',
                'seven',
                'eight',
              ] as const
            ).map((item) => (
              <details key={item}>
                <summary>{m[`hotel.faq.${item}.question`]()}</summary>
                <p>{m[`hotel.faq.${item}.answer`]()}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="hl-bottom">
          <h2>{m['hotel.bottom.title']()}</h2>
          <p>{m['hotel.bottom.text']()}</p>
          <a className="hl-button" href="#create">
            {m['hotel.hero.cta']()} <ArrowRight size={18} />
          </a>
        </section>
      </main>
      <footer className="hl-footer">
        <div>
          <Link href="/" className="hl-brand">
            <img
              src={envConfigs.app_logo}
              alt={m['hotel.logo_alt']()}
              width={512}
              height={512}
              className="hl-brand-mark"
            />
            <span>{envConfigs.app_name}</span>
          </Link>
          <p>{m['hotel.footer.line']()}</p>
        </div>
        <div className="hl-footer-links">
          <a href="mailto:support@hotel-lobby.org">support@hotel-lobby.org</a>
          <Link href="/privacy-policy">{m['landing.footer.privacy']()}</Link>
          <Link href="/terms-of-service">{m['landing.footer.terms']()}</Link>
        </div>
      </footer>
    </div>
  );
}
