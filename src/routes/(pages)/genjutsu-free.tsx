import { createFileRoute } from '@tanstack/react-router';

import { staticPageRouteOptions } from './-static-page';

export const Route = createFileRoute('/(pages)/genjutsu-free')(
  staticPageRouteOptions('genjutsu-free')
);
