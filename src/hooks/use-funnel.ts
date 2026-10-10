import { useCallback } from 'react';

import { useSession } from '@/core/auth/client';
import {
  trackFunnelEvent,
  type FunnelEvent,
  type FunnelProperties,
} from '@/lib/funnel';
import { useUserPermissions } from '@/hooks/use-user-permissions';

export function useFunnel() {
  const { data: session, isPending } = useSession();
  const permissions = useUserPermissions(Boolean(session?.user));
  // Unknown permissions fail closed. Local previews and admins are never counted.
  const enabled =
    !import.meta.env.DEV &&
    !isPending &&
    (!session?.user || (permissions.isSuccess && !permissions.data.isAdmin));
  const track = useCallback(
    (event: FunnelEvent, properties: FunnelProperties = {}) =>
      trackFunnelEvent(event, properties, enabled),
    [enabled]
  );
  return { track, enabled };
}
