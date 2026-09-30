import { getPlatformProxy } from 'wrangler';

const p = await getPlatformProxy({
  configPath: process.cwd() + '/wrangler.jsonc',
  remoteBindings: true,
});
const r = await p.env.DB.prepare('select count(*) as n from user').all();
console.log('users in D1:', JSON.stringify(r.results));
await p.dispose();
