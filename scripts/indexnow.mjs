// Notifies IndexNow (Bing, Yandex, Seznam, Naver and others; Bing results also
// ground ChatGPT search and Copilot) that the canonical pages changed.
//
// Run after a deploy, once the key file below is live at the site root:
//   npm run seo:indexnow            submit every sitemap URL
//   npm run seo:indexnow -- --dry   print the request without sending it
import fs from 'node:fs';
import { SITE_ORIGIN } from './seo-config.mjs';

export const INDEXNOW_KEY = '29c5fae97ae9363315db62e3db72671c';

const urlList = [...fs.readFileSync('sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const body = {
  host: new URL(SITE_ORIGIN).host,
  key: INDEXNOW_KEY,
  keyLocation: `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`,
  urlList
};

if (process.argv.includes('--dry')) {
  console.log(JSON.stringify(body, null, 2));
} else {
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body)
  });
  console.log(`IndexNow: HTTP ${response.status} for ${urlList.length} URLs`);
  if (!response.ok) process.exitCode = 1;
}
