import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/core/auth/client';
import { apiGet } from '@/lib/api-client';

export interface UserPermissions {
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  permissions?: string[];
}

// Current user's permission summary — shared by site-user-menu and
// app-layout (single network call, react-query dedupes).
export function useUserPermissions(enabled = true) {
  const { data: session } = useSession();
  return useQuery({
    queryKey: ['user-permissions', session?.user?.id],
    queryFn: () => apiGet<UserPermissions>('/api/user/permissions'),
    staleTime: 5 * 60_000,
    enabled: enabled && Boolean(session?.user),
  });
}
