import { createFileRoute } from '@tanstack/react-router';

import { staticPageRouteOptions } from './-static-page';

export const Route = createFileRoute(
  '/(pages)/higgsfield-genjutsu-alternative'
)(staticPageRouteOptions('higgsfield-genjutsu-alternative'));
