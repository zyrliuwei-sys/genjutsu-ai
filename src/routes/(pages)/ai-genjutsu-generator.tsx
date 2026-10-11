import { createFileRoute } from '@tanstack/react-router';

import { staticPageRouteOptions } from './-static-page';

export const Route = createFileRoute('/(pages)/ai-genjutsu-generator')(
  staticPageRouteOptions('ai-genjutsu-generator')
);
