'use client';

import { useState } from 'react';
import { LogIn, Menu, ShieldIcon, X } from 'lucide-react';

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

/** Off-site URLs render as plain <a>; internal paths use the locale-aware Link. */
const isExternalHref = (href: string) => /^https?:\/\//.test(href);

export function SiteHeader({
  navLinks,
  logoAlt,
}: {
  navLinks?: NavLink[];
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
            isExternalHref(link.href) ? (
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
              isExternalHref(link.href) ? (
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
