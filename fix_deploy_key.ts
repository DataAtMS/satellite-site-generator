// Run with: cd /home/ubuntu/site-generator && npx tsx fix_deploy_key.ts
import 'dotenv/config';
import { Octokit } from '@octokit/rest';
import crypto from 'crypto';

const netlifyToken = process.env.NETLIFY_PAT;
const githubToken = process.env.GITHUB_PAT;
if (!netlifyToken || !githubToken) { console.log('Missing tokens'); process.exit(1); }

const owner = 'DataAtMS';
const repo = 'ecommercedataanalytics';
const netlifySiteId = '35dd392c-3e51-4c89-bdde-94ee0dd3da49';

const octokit = new Octokit({ auth: githubToken });

// Step 1: Check repo visibility
const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
console.log('Repo visibility:', repoData.private ? 'PRIVATE' : 'PUBLIC');

if (!repoData.private) {
  console.log('Repo is public — deploy key not needed. The issue may be something else.');
  // Try triggering a new build manually
  console.log('\nTriggering a new build on Netlify...');
  const buildRes = await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}/builds`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${netlifyToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const buildData = await buildRes.json() as any;
  console.log('Build triggered:', buildData.id || buildData);
  process.exit(0);
}

// Step 2: Generate a new SSH key pair
console.log('\nGenerating new SSH key pair...');
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// Convert public key from PEM to OpenSSH format
// We'll use the Netlify API to get the deploy key public key instead
// Step 3: Get Netlify's deploy key for this site
console.log('Getting Netlify deploy key...');
const dkRes = await fetch(`https://api.netlify.com/api/v1/deploy_keys`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${netlifyToken}`, 'Content-Type': 'application/json' },
});
const deployKey = await dkRes.json() as any;
console.log('Deploy key ID:', deployKey.id);
console.log('Public key:', deployKey.public_key?.slice(0, 50) + '...');

// Step 4: Add the deploy key to GitHub
console.log('\nAdding deploy key to GitHub repo...');
try {
  const { data: ghKey } = await octokit.rest.repos.createDeployKey({
    owner,
    repo,
    title: `Netlify deploy key ${new Date().toISOString().slice(0, 10)}`,
    key: deployKey.public_key,
    read_only: true,
  });
  console.log('GitHub deploy key added:', ghKey.id);
} catch (e: any) {
  console.log('GitHub deploy key error:', e.message);
}

// Step 5: Update Netlify site to use this deploy key
console.log('\nUpdating Netlify site with deploy key...');
const updateRes = await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${netlifyToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    repo: {
      provider: 'github',
      repo: `${owner}/${repo}`,
      branch: 'main',
      cmd: 'npm install && npm run build',
      dir: 'dist',
      deploy_key_id: deployKey.id,
    },
  }),
});
const updated = await updateRes.json() as any;
console.log('Site updated, build_settings:', updated.build_settings?.repo_url);

// Step 6: Trigger a new build
console.log('\nTriggering new build...');
const buildRes = await fetch(`https://api.netlify.com/api/v1/sites/${netlifySiteId}/builds`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${netlifyToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});
const buildData = await buildRes.json() as any;
console.log('Build triggered:', buildData.id || JSON.stringify(buildData).slice(0, 100));
