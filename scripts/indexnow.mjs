// Notifies IndexNow (Bing, Yandex, Seznam, Naver and others; Bing results also
// ground ChatGPT search and Copilot) that the canonical pages changed.
//
// Run after a deploy, once the key file below is live at the site root:
//   npm run seo:indexnow            submit every sitemap URL
//   npm run seo:indexnow -- --dry   print the request without sending it
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_ORIGIN } from './seo-config.mjs';

export const INDEXNOW_KEY = '29c5fae97ae9363315db62e3db72671c';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sitemapFiles = ['sitemap.xml', 'sitemap-articles.xml'].filter((file) => fs.existsSync(path.join(root, file)));
const urlList = [...new Set(sitemapFiles.flatMap((file) =>
  [...fs.readFileSync(path.join(root, file), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
))];
if (!urlList.length || urlList.some((url) => new URL(url).origin !== SITE_ORIGIN)) {
  throw new Error('IndexNow requires non-empty, on-origin canonical sitemap URLs.');
}
const body = {
  host: new URL(SITE_ORIGIN).host,
  key: INDEXNOW_KEY,
  keyLocation: `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`,
  urlList
};

if (process.argv.includes('--dry')) {
  console.log(JSON.stringify(body, null, 2));
} else {
  // Never notify crawlers of local changes which have not been published.
  const keyResponse = await fetch(body.keyLocation, { signal: AbortSignal.timeout(15000) });
  if (!keyResponse.ok || (await keyResponse.text()).trim() !== INDEXNOW_KEY) {
    throw new Error('The IndexNow key must be live before submitting URLs.');
  }
  for (const file of sitemapFiles) {
    const live = await fetch(`${SITE_ORIGIN}/${file}`, { signal: AbortSignal.timeout(15000) });
    if (!live.ok || (await live.text()).trim() !== fs.readFileSync(path.join(root, file), 'utf8').trim()) {
      throw new Error(`${file} differs from production. Publish and verify the site before submitting URLs.`);
    }
  }
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000)
  });
  console.log(`IndexNow: HTTP ${response.status} for ${urlList.length} URLs`);
  if (!response.ok) process.exitCode = 1;
}
