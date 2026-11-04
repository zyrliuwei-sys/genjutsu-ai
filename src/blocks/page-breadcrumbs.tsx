import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import {
  SiteBreadcrumbs,
  type BreadcrumbParent,
} from '@/components/site-breadcrumbs';

export function PageBreadcrumbs({
  currentPage,
  parents,
  className,
}: {
  currentPage: string;
  parents?: BreadcrumbParent[];
  className?: string;
}) {
  return (
    <SiteBreadcrumbs
      homeLabel={envConfigs.app_name}
      ariaLabel={m['common.navigation.breadcrumb']()}
      currentPage={currentPage}
      parents={parents}
      className={className}
    />
  );
}
