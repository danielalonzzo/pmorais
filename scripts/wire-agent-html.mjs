// One-off wiring pass: adds the agent discovery <link> elements and the WebMCP
// module to every canonical public page. Idempotent — safe to re-run.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ASSET_VERSION, PUBLIC_PAGES, SITE_ORIGIN } from './seo-config.mjs';
import { MARKDOWN_DIR } from './agent-config.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const markdownRelative = (pagePath) => {
  const trimmed = pagePath.replace(/^\/+/, '');
  return trimmed === '' || trimmed.endsWith('/') ? `${trimmed}index.md` : `${trimmed}.md`;
};

let changed = 0;
for (const page of PUBLIC_PAGES) {
  const file = path.join(root, page.file);
  let html = fs.readFileSync(file, 'utf8');
  const before = html;

  // 1. Head discovery links, immediately after the llms-full.txt link.
  if (!html.includes('rel="ai-catalog"')) {
    const anchor = new RegExp(`([ \\t]*)<link rel="alternate" type="text/plain" href="${SITE_ORIGIN}/llms-full\\.txt"[^>]*>`);
    const match = anchor.exec(html);
    if (!match) throw new Error(`${page.file}: llms-full.txt discovery link not found`);
    const indent = match[1];
    const markdownUrl = `${SITE_ORIGIN}/${MARKDOWN_DIR}/${markdownRelative(page.path)}`;
    html = html.replace(anchor, `${match[0]}
${indent}<link rel="alternate" type="text/markdown" href="${markdownUrl}" title="Markdown rendition">
${indent}<link rel="ai-catalog" href="/.well-known/ai-catalog.json">
${indent}<link rel="service-desc" type="application/vnd.oai.openapi+json;version=3.1" href="/openapi.json">`);
  }

  // 2. WebMCP tools, alongside the existing page script and with the same prefix.
  if (!html.includes('webmcp.js')) {
    const anchor = /([ \t]*)<script nonce="pmorais-2026" src="((?:\.\.\/)?js\/)script\.js\?v=[^"]*" defer><\/script>/;
    const match = anchor.exec(html);
    if (!match) throw new Error(`${page.file}: page script tag not found`);
    html = html.replace(anchor, `${match[0]}
${match[1]}<script nonce="pmorais-2026" src="${match[2]}webmcp.js?v=${ASSET_VERSION}" defer></script>`);
  }

  if (html !== before) {
    fs.writeFileSync(file, html);
    changed += 1;
    console.log(`wired ${page.file}`);
  } else {
    console.log(`unchanged ${page.file}`);
  }
}
console.log(`\n${changed} page(s) updated.`);
