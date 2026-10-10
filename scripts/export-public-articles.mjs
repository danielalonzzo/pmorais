import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildArticleSitemap, escapeHtml, plainText, renderArticle, safeExternalUrl } from './article-renderer.mjs';
import { ASSET_VERSION } from './seo-config.mjs';

const PROJECT = 'paulo-morais';
const ORIGIN = 'https://pmorais.pt';
const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function decodeFirestoreValue(value) {
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decodeFirestoreValue);
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields ?? {}).map(([key, entry]) => [key, decodeFirestoreValue(entry)]));
  return null;
}

function isoDate(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function buildArticleDocuments(snapshot) {
  if (!Array.isArray(snapshot)) throw new Error('Expected the public Firestore runQuery response array.');
  if (snapshot.some((entry) => entry?.error)) throw new Error('Firestore returned an error; existing exports were not changed.');
  const articles = [];
  const seen = new Set();
  for (const entry of snapshot) {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid Firestore query response.');
    if (!entry.document) {
      if (!entry.readTime) throw new Error('Expected a document or Firestore readTime response.');
      continue;
    }
    const document = entry.document;
    const match = document.name?.match(/^projects\/paulo-morais\/databases\/\(default\)\/documents\/blog_posts\/([A-Za-z0-9_-]{1,150})$/);
    if (!match || !document.fields) throw new Error('Unexpected Firestore document path; only public blog_posts are supported.');
    const id = match[1];
    if (seen.has(id)) throw new Error(`Duplicate Firestore document ${id}.`);
    seen.add(id);
    const data = Object.fromEntries(Object.entries(document.fields).map(([key, value]) => [key, decodeFirestoreValue(value)]));
    if (data.published !== true) continue;
    const format = ['article', 'video', 'pdf', 'clinical_case'].includes(data.format) ? data.format : 'article';
    for (const baseLanguage of ['pt', 'en']) {
      const language = baseLanguage === 'en' ? 'en-GB' : 'pt-PT';
      const title = plainText(data[`title_${baseLanguage}`]);
      const contentHtml = typeof data[`content_${baseLanguage}`] === 'string' ? data[`content_${baseLanguage}`] : '';
      const summaryHtml = typeof data[`summary_${baseLanguage}`] === 'string' ? data[`summary_${baseLanguage}`] : '';
      const bodyText = plainText(contentHtml);
      const summaryText = plainText(summaryHtml);
      const attachment = (format === 'pdf' && safeExternalUrl(data.pdfUrl)) || (format === 'video' && safeExternalUrl(data.videoUrl));
      // Quill's <p><br></p> is not a translation. No language fallback is exported.
      if (!title || (!bodyText && !(attachment && summaryText))) continue;
      const descriptionSource = summaryText || bodyText;
      const description = descriptionSource.length > 180 ? `${descriptionSource.slice(0, 177).trimEnd()}…` : descriptionSource;
      const route = `${baseLanguage === 'en' ? '/en/articles' : '/artigos'}/${id}`;
      articles.push({
        id, language, path: route, url: `${ORIGIN}${route}`, title, description,
        publishedAt: isoDate(data.createdAt), modifiedAt: isoDate(data.updatedAt) || isoDate(document.updateTime) || isoDate(data.createdAt),
        format, ...(typeof data.author === 'string' && data.author.trim() ? { author: data.author.trim() } : {}),
        contentHtml, summaryHtml,
        coverImageUrl: data.coverImageUrl, pdfUrl: data.pdfUrl, videoUrl: data.videoUrl,
        beforeImageUrl: data.beforeImageUrl, afterImageUrl: data.afterImageUrl
      });
    }
  }
  return articles.sort((left, right) => (right.publishedAt ?? '').localeCompare(left.publishedAt ?? '') || left.id.localeCompare(right.id) || left.language.localeCompare(right.language));
}

export function staticArticleIndex(articles, language) {
  const entries = articles.filter((article) => article.language.split('-')[0] === language.split('-')[0]);
  const english = language.split('-')[0] === 'en';
  return `<!-- public-article-index:start -->\n            <section id="static-article-index" aria-labelledby="static-article-index-title" style="margin: 40px 0; padding-top: 26px; border-top: 1px solid #666;">
                <h2 id="static-article-index-title" style="font-size: 1.4rem; margin-bottom: 18px;">${english ? 'Published articles and resources' : 'Artigos e recursos publicados'}</h2>
                <ul style="display: grid; gap: 15px; list-style: none; padding: 0;">${entries.map((article) => `\n                    <li><a href="${escapeHtml(article.path)}" style="color: var(--color-primary-text); text-decoration: underline;">${escapeHtml(article.title)}</a></li>`).join('')}
                </ul>
            </section>\n            <!-- public-article-index:end -->`;
}

export function writeArticleExport(snapshot, { root = defaultRoot, assetVersion = ASSET_VERSION, allowEmpty = false, generatedAt = new Date().toISOString() } = {}) {
  const articles = buildArticleDocuments(snapshot);
  if (!articles.length && !allowEmpty) throw new Error('No genuine published articles were found. Use --allow-empty only when clearing all exported articles intentionally.');
  const manifestFile = path.join(root, 'api/v1/articles.json');
  let previous = [];
  if (fs.existsSync(manifestFile)) {
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    if (!Array.isArray(manifest.articles)) throw new Error('Existing article manifest is invalid; nothing was replaced.');
    previous = manifest.articles;
  }
  // Validate all output paths and prepare every template before changing files.
  const output = articles.map((article) => ({ article, file: path.join(root, `${article.path.slice(1)}.html`), html: renderArticle(article, articles.filter((candidate) => candidate.id === article.id), assetVersion) }));
  const oldFiles = previous.map((article) => {
    if (!/^\/(?:artigos|en\/articles)\/[A-Za-z0-9_-]{1,150}$/.test(article.path ?? '')) throw new Error('Unsafe path in previous article manifest.');
    return path.join(root, `${article.path.slice(1)}.html`);
  });
  const blogUpdates = ['pt', 'en'].map((language) => {
    const file = path.join(root, language === 'en' ? 'en/blog.html' : 'blog.html');
    if (!fs.existsSync(file)) return null;
    const source = fs.readFileSync(file, 'utf8');
    const section = staticArticleIndex(articles, language);
    const marker = /<!-- public-article-index:start -->[\s\S]*?<!-- public-article-index:end -->/;
    if (marker.test(source)) return { file, html: source.replace(marker, section) };
    const end = source.lastIndexOf('</div>', source.indexOf('</main>'));
    if (end < 0) throw new Error(`Could not locate article index insertion point in ${file}.`);
    return { file, html: `${source.slice(0, end)}${section}\n        ${source.slice(end)}` };
  }).filter(Boolean);
  const metadata = articles.map(({ contentHtml, summaryHtml, coverImageUrl, pdfUrl, videoUrl, beforeImageUrl, afterImageUrl, ...article }) => article);
  const manifest = { generatedAt, source: { type: 'public-firestore', projectId: PROJECT, collection: 'blog_posts' }, count: metadata.length, articles: metadata };
  for (const item of output) { fs.mkdirSync(path.dirname(item.file), { recursive: true }); fs.writeFileSync(item.file, item.html); }
  for (const update of blogUpdates) fs.writeFileSync(update.file, update.html);
  fs.writeFileSync(path.join(root, 'sitemap-articles.xml'), buildArticleSitemap(articles));
  fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  const currentFiles = new Set(output.map((item) => item.file));
  for (const file of oldFiles) if (!currentFiles.has(file) && fs.existsSync(file)) fs.unlinkSync(file);
  return manifest;
}

export async function fetchPublicArticles() {
  const endpoint = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`;
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'blog_posts' }], where: { fieldFilter: { field: { fieldPath: 'published' }, op: 'EQUAL', value: { booleanValue: true } } } } })
  });
  if (!response.ok) throw new Error(`Public Firestore query returned HTTP ${response.status}; existing exports were not changed.`);
  return response.json();
}

async function main() {
  const argumentsList = process.argv.slice(2);
  const valueAfter = (flag) => { const index = argumentsList.indexOf(flag); return index === -1 ? null : argumentsList[index + 1]; };
  const input = valueAfter('--input');
  const fetchMode = argumentsList.includes('--fetch');
  if ((input ? 1 : 0) + (fetchMode ? 1 : 0) !== 1) throw new Error('Usage: node scripts/export-public-articles.mjs (--input public-runQuery.json | --fetch) [--allow-empty] [--output-root directory]');
  const snapshot = input ? JSON.parse(fs.readFileSync(input, 'utf8')) : await fetchPublicArticles();
  const manifest = writeArticleExport(snapshot, { root: valueAfter('--output-root') ? path.resolve(valueAfter('--output-root')) : defaultRoot, allowEmpty: argumentsList.includes('--allow-empty') });
  console.log(`Exported ${manifest.count} published article translations (${new Set(manifest.articles.map((article) => article.id)).size} documents). Refresh this public snapshot before deploying article edits, removals or new publications.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
