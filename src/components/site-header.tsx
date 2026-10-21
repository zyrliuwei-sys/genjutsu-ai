'use client';

import { useRef, useState } from 'react';
import { ChevronDown, LogIn, Menu, ShieldIcon, X } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { LocaleSelector } from '@/components/locale-selector';
import { SiteUserMenu } from '@/components/site-user-menu';

export interface NavLink {
  href: string;
  label: string;
  /** Open in a new tab. Off-site (http) hrefs always open in a new tab. */
  external?: boolean;
}

export interface NavGroupItem {
  href: string;
  label: string;
  description?: string;
  /** Square thumbnail shown beside the label in the dropdown. */
  thumb?: string;
}

/** A nav entry that opens a dropdown of internal pages. */
export interface NavGroup {
  label: string;
  items: NavGroupItem[];
}

export type NavItem = NavLink | NavGroup;

const isGroup = (item: NavItem): item is NavGroup => 'items' in item;

/** Off-site URLs render as plain <a>; internal paths use the locale-aware Link. */
const isExternalHref = (href: string) => /^https?:\/\//.test(href);

/** Desktop dropdown: opens on hover, click or keyboard; closes on leave/Escape. */
function NavDropdown({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  // A short delay so crossing the gap to the panel doesn't close it.
  const hide = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };
  return (
    <div
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground aria-expanded:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
      >
        {group.label}
        <ChevronDown
          aria-hidden
          className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="absolute top-full left-1/2 z-50 -translate-x-1/2 pt-3">
          <div className="border-border bg-popover text-popover-foreground w-72 rounded-xl border p-1.5 shadow-xl">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="hover:bg-accent flex items-center gap-3 rounded-lg p-2 transition-colors"
              >
                {item.thumb && (
                  <img
                    src={item.thumb}
                    alt=""
                    aria-hidden
                    width={40}
                    height={40}
                    loading="lazy"
                    className="size-10 shrink-0 rounded-md object-cover"
                  />
                )}
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="text-muted-foreground block truncate text-xs">
                      {item.description}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SiteHeader({
  navLinks,
  logoAlt,
}: {
  navLinks?: NavItem[];
  logoAlt: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;
  const { data: permissions } = useUserPermissions(!!user);
  const isAdmin = !!user && permissions?.isAdmin === true;

  return (
    <header className="bg-background/85 border-border sticky top-0 z-50 w-full border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src={envConfigs.app_logo}
            alt={logoAlt}
            width={512}
            height={512}
            className="size-7 rounded-md"
          />
          <span className="font-serif text-[22px] leading-none">
            {envConfigs.app_name}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks?.map((link) =>
            isGroup(link) ? (
              <NavDropdown key={link.label} group={link} />
            ) : isExternalHref(link.href) ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors"
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          <LocaleSelector />
          {isAdmin && (
            <Link
              href="/admin"
              className="border-border text-foreground hover:bg-accent inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors"
            >
              <ShieldIcon className="size-4" />
              {m['common.systems.admin']()}
            </Link>
          )}
          {user ? (
            <SiteUserMenu
              name={user.name || 'User'}
              email={user.email}
              image={user.image}
            />
          ) : (
            <Link href="/sign-in" className="eg-pill-primary">
              <LogIn className="size-4" />
              {m['common.nav.sign_in']()}
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="-mr-2 p-2 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-border mx-auto max-w-7xl border-t px-4 pt-2 pb-4 md:hidden">
          <nav className="flex flex-col gap-2">
            {navLinks?.map((link) =>
              isGroup(link) ? (
                <div key={link.label} className="flex flex-col gap-1">
                  <span className="text-muted-foreground/70 px-3 pt-1 text-xs font-medium tracking-wide uppercase">
                    {link.label}
                  </span>
                  {link.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.thumb && (
                        <img
                          src={item.thumb}
                          alt=""
                          aria-hidden
                          width={28}
                          height={28}
                          loading="lazy"
                          className="size-7 shrink-0 rounded-md object-cover"
                        />
                      )}
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : isExternalHref(link.href) ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md px-3 py-2 text-sm transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md px-3 py-2 text-sm transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>
          <div className="border-border mt-3 flex items-center gap-2 border-t pt-3">
            <LocaleSelector />
            <div className="flex-1" />
            {isAdmin && (
              <Link
                href="/admin"
                className="border-border text-foreground hover:bg-accent inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <ShieldIcon className="size-4" />
                {m['common.systems.admin']()}
              </Link>
            )}
            {user ? (
              <SiteUserMenu
                name={user.name || 'User'}
                email={user.email}
                image={user.image}
              />
            ) : (
              <Link
                href="/sign-in"
                className="eg-pill-primary"
                onClick={() => setMobileOpen(false)}
              >
                <LogIn className="size-4" />
                {m['common.nav.sign_in']()}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
