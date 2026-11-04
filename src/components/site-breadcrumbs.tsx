import { Fragment } from 'react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export type BreadcrumbParent = { label: string; href: string };

export function SiteBreadcrumbs({
  homeLabel,
  ariaLabel,
  currentPage,
  parents = [],
  className,
}: {
  homeLabel: string;
  ariaLabel: string;
  currentPage: string;
  parents?: BreadcrumbParent[];
  className?: string;
}) {
  return (
    <Breadcrumb
      aria-label={ariaLabel}
      className={cn('w-full min-w-0 text-left', className)}
      data-testid="page-breadcrumbs"
    >
      <BreadcrumbList className="gap-x-3 gap-y-1 text-xs sm:text-sm">
        {[{ label: homeLabel, href: '/' }, ...parents].map((item) => (
          <Fragment key={item.href}>
            <BreadcrumbItem className="min-w-0">
              <Link
                href={item.href}
                className="hover:text-foreground rounded-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                {item.label}
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
          </Fragment>
        ))}
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="text-muted-foreground">
            {currentPage}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
