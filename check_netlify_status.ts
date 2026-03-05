// Run with: cd /home/ubuntu/site-generator && npx tsx check_netlify_status.ts
import 'dotenv/config';

const token = process.env.NETLIFY_PAT;
if (!token) { console.log('No NETLIFY_PAT'); process.exit(1); }

const siteId = '35dd392c-3e51-4c89-bdde-94ee0dd3da49';

const siteRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
  headers: { Authorization: `Bearer ${token}` }
});
const site = await siteRes.json() as any;
console.log('Site state:', site.state);
console.log('Site URL:', site.ssl_url || site.url);
console.log('Build cmd:', site.build_settings?.cmd);
console.log('Publish dir:', site.build_settings?.dir);
console.log('Repo:', site.build_settings?.repo_url);

const deploysRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=3`, {
  headers: { Authorization: `Bearer ${token}` }
});
const deploys = await deploysRes.json() as any[];
console.log('\n--- Latest deploys ---');
for (const d of deploys) {
  console.log(`state=${d.state} error=${d.error_message || 'none'} url=${d.deploy_ssl_url || 'n/a'}`);
}
