import { ASSET_VERSION, LOCALES, SITE_ORIGIN as ORIGIN } from './seo-config.mjs';

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export function plainText(html = '') {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', atilde: 'ã', otilde: 'õ', ccedil: 'ç', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', acirc: 'â', ecirc: 'ê', ocirc: 'ô' };
  return (typeof html === 'string' ? html : '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, entity) => {
      if (!entity.startsWith('#')) return named[entity.toLowerCase()] ?? whole;
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ' ';
    }).replace(/\s+/g, ' ').trim();
}

export function safeExternalUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export function renderArticle(article, translations, assetVersion = ASSET_VERSION) {
  const english = article.language.split('-')[0] === 'en';
  const prefix = english ? '/en' : '';
  const home = `${prefix}/`;
  const blog = `${prefix}/blog`;
  const heading = english ? 'Published by' : 'Publicado por';
  const dateLocale = english ? 'en-GB' : 'pt-PT';
  const date = article.publishedAt ? new Intl.DateTimeFormat(dateLocale, { dateStyle: 'long', timeZone: 'Europe/Lisbon' }).format(new Date(article.publishedAt)) : '';
  const cover = safeExternalUrl(article.coverImageUrl);
  const external = article.format === 'pdf' ? safeExternalUrl(article.pdfUrl) : article.format === 'video' ? safeExternalUrl(article.videoUrl) : null;
  const graph = {
    '@context': 'https://schema.org', '@type': 'Article', '@id': `${article.url}#article`,
    url: article.url, mainEntityOfPage: article.url, headline: article.title,
    description: article.description, inLanguage: article.language,
    publisher: { '@type': 'Organization', name: 'Paulo Morais — Your Own Workout', url: ORIGIN },
    ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
    ...(article.modifiedAt ? { dateModified: article.modifiedAt } : {}),
    ...(cover ? { image: cover } : {}),
    // The author field is a publishing credit for externally hosted studies/videos,
    // not evidence that the uploader wrote the linked scientific publication.
    ...(article.author && !['pdf', 'video'].includes(article.format) ? { author: { '@type': 'Person', name: article.author } } : {}),
    ...(external ? { citation: external } : {})
  };
  const json = JSON.stringify(graph, null, 2).replaceAll('<', '\\u003c');
  const summary = article.summaryHtml && ['pdf', 'video'].includes(article.format)
    ? `<div class="export-summary">${article.summaryHtml}</div>` : '';
  const resource = external ? `<aside class="export-resource"><a href="${escapeHtml(external)}" target="_blank" rel="noopener noreferrer">${english ? (article.format === 'pdf' ? 'Read the original document' : 'Watch the original video') : (article.format === 'pdf' ? 'Ler o documento original' : 'Ver o vídeo original')} ↗</a><p>${english ? 'External source. Authorship and credits are provided by the linked publication.' : 'Fonte externa. A autoria e os créditos constam da publicação ligada.'}</p></aside>` : '';
  const clinicalImages = article.format === 'clinical_case' ? ['beforeImageUrl', 'afterImageUrl'].map((key, index) => {
    const image = safeExternalUrl(article[key]);
    return image ? `<figure><img src="${escapeHtml(image)}" loading="lazy" alt="${english ? (index ? 'After' : 'Before') : (index ? 'Depois' : 'Antes')}"></figure>` : '';
  }).join('') : '';
  const alternatives = translations.map((translation) => `<link rel="alternate" hreflang="${LOCALES[translation.language].hreflang}" href="${escapeHtml(translation.url)}">`).join('\n    ');
  const languageLinks = translations.filter((translation) => translation.language !== article.language).map((translation) => `<a href="${escapeHtml(translation.path)}" hreflang="${LOCALES[translation.language].hreflang}" lang="${translation.language}">${translation.language.split('-')[0] === 'en' ? 'English' : 'Português'}</a>`).join('');
  return `<!DOCTYPE html>
<html lang="${article.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(article.title)} | Paulo Morais</title>
    <meta name="description" content="${escapeHtml(article.description)}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${escapeHtml(article.url)}">
    ${alternatives}
    <meta property="og:type" content="article">
    <meta property="og:title" content="${escapeHtml(article.title)}">
    <meta property="og:description" content="${escapeHtml(article.description)}">
    <meta property="og:url" content="${escapeHtml(article.url)}">
    <meta property="og:locale" content="${english ? 'en_GB' : 'pt_PT'}">
    <meta property="og:image" content="${escapeHtml(cover || `${ORIGIN}/images/sobre-mim/paulo-morais.webp`)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(article.title)}">
    <meta name="twitter:description" content="${escapeHtml(article.description)}">
    <meta name="twitter:image" content="${escapeHtml(cover || `${ORIGIN}/images/sobre-mim/paulo-morais.webp`)}">
    <link rel="icon" href="/images/logo/logo_ios_android.png">
    <link rel="stylesheet" href="/css/style.css?v=${escapeHtml(assetVersion)}">
    <link rel="alternate" type="application/json" href="/api/v1/articles.json">
    <style nonce="pmorais-2026">
      body.article-export{background:#f5f4f0;color:#1b1b1b;line-height:1.8;overflow-wrap:break-word}
      .export-top{position:static;background:#0b0b0b;color:#fff;padding:20px max(22px,calc((100vw - 1120px)/2));display:flex;flex-wrap:wrap;gap:20px;align-items:center;justify-content:space-between}
      .export-top img{width:82px;height:auto}.export-nav{display:flex;flex-wrap:wrap;gap:12px 22px;align-items:center;font-size:.95rem}.export-nav a:hover,.export-nav a:focus-visible{color:#e6ae17}
      .export-main{width:min(900px,calc(100% - 44px));margin:50px auto 75px}.export-breadcrumb{display:flex;gap:10px;flex-wrap:wrap;font-size:.9rem;margin-bottom:32px}
      .export-breadcrumb a,.export-body a,.export-summary a{color:#735000;text-decoration:underline;text-underline-offset:3px}
      .export-label{text-transform:uppercase;letter-spacing:.12em;font-size:.8rem;color:#715200;margin-bottom:14px}
      .export-main h1{font-family:var(--font-heading);font-size:clamp(1.8rem,4.5vw,3.1rem);line-height:1.18;margin:0 0 22px;color:#111;overflow-wrap:anywhere}
      .export-byline{font-size:.9rem;color:#555;margin-bottom:35px}.export-body{font-size:1.08rem}.export-body p,.export-summary p{margin:0 0 1.3em}.export-body h2,.export-body h3,.export-body h4{color:#111;line-height:1.35;margin:1.5em 0 .7em}
      .export-body ul,.export-body ol,.export-summary ul,.export-summary ol{padding-left:1.6em;list-style:revert;margin:0 0 1.3em}.export-body li{margin:.4em 0}.export-body blockquote{border-left:3px solid #b58a1a;padding-left:1.2em;margin:1.4em 0}.export-body img{max-width:100%;height:auto}.export-body table{display:block;max-width:100%;overflow:auto}.export-body pre{white-space:pre-wrap;overflow-wrap:anywhere}
      .export-summary{font-size:1.08rem;border-bottom:1px solid #d7d2c6;padding-bottom:12px;margin-bottom:28px}.export-resource{background:#eae6db;border-left:4px solid #b58a1a;padding:18px 22px;margin:25px 0 35px}.export-resource a{font-weight:700;text-decoration:underline;color:#4f3900}.export-resource p{font-size:.86rem;margin:8px 0 0}
      .export-services{background:#0b0b0b;color:#fff;padding:35px max(22px,calc((100vw - 1120px)/2))}.export-services p{color:#ccc;margin:12px 0}.export-services a{color:#e6ae17}.export-services nav{display:flex;flex-wrap:wrap;gap:12px 24px;margin:20px 0}
      @media(max-width:600px){.export-main{margin-top:28px}.export-top{gap:14px}.export-nav{gap:10px 16px;font-size:.86rem}.export-body{font-size:1rem}}
    </style>
    <script nonce="pmorais-2026" type="application/ld+json">${json}</script>
</head>
<body class="article-export">
    <header class="export-top"><a href="${home}" aria-label="Paulo Morais"><img src="/images/logo/logo_amarelo_alpha.webp" width="438" height="360" alt="Paulo Morais"></a><nav class="export-nav" aria-label="${english ? 'Main navigation' : 'Navegação principal'}"><a href="${home}">${english ? 'Home' : 'Início'}</a><a href="${blog}">Blog</a><a href="${prefix}/sobre-mim${english ? '#personal-training' : '#treino-personalizado'}">${english ? 'Personal training' : 'Treino personalizado'}</a>${languageLinks}<a href="${prefix}/perfil?booking=true">${english ? 'Book a session' : 'Agendar'}</a></nav></header>
    <main class="export-main">
      <nav class="export-breadcrumb" aria-label="Breadcrumb"><a href="${home}">${english ? 'Home' : 'Início'}</a><span aria-hidden="true">/</span><a href="${blog}">Blog</a></nav>
      <article>
        <p class="export-label">Paulo Morais · ${english ? 'Articles and knowledge' : 'Artigos e conhecimento'}</p>
        <h1>${escapeHtml(article.title)}</h1>
        <p class="export-byline">${article.author ? `${heading} ${escapeHtml(article.author)}${date ? ' · ' : ''}` : ''}${date ? `<time datetime="${escapeHtml(article.publishedAt)}">${escapeHtml(date)}</time>` : ''}</p>
        ${summary}${resource}${clinicalImages}
        <div class="export-body">${article.contentHtml}</div>
      </article>
    </main>
    <footer class="export-services"><strong>Paulo Morais — Your Own Workout</strong><p>${english ? 'Personal trainer and osteopath in Lisbon. Online training in Portugal and internationally.' : 'Personal trainer e osteopata em Lisboa. Treino online em Portugal e no estrangeiro.'}</p><nav aria-label="${english ? 'Services' : 'Serviços'}"><a href="${prefix}/sobre-mim${english ? '#personal-training' : '#treino-personalizado'}">${english ? 'Personal training' : 'Treino personalizado'}</a><a href="${english ? '/en/group-training' : '/treino-em-grupo'}">${english ? 'Group training' : 'Treino em grupo'}</a><a href="${english ? '/en/online-training' : '/treino-online'}">${english ? 'Online training' : 'Treino online'}</a><a href="${prefix}/osteopatia">${english ? 'Osteopathy' : 'Osteopatia'}</a><a href="${english ? '/en/oncology-training' : '/treino-oncologico'}">${english ? 'Cancer exercise' : 'Treino oncológico'}</a><a href="${blog}">${english ? 'Back to the blog' : 'Voltar ao blog'}</a></nav><a href="mailto:pt@pmorais.pt">pt@pmorais.pt</a> · <a href="tel:+351960471537">+351 960 471 537</a></footer>
</body>
</html>
`;
}

export function buildArticleSitemap(articles) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${articles.map((article) => {
    const translations = articles.filter((candidate) => candidate.id === article.id);
    return `  <url><loc>${escapeHtml(article.url)}</loc>${article.modifiedAt ? `<lastmod>${escapeHtml(article.modifiedAt)}</lastmod>` : ''}${translations.map((translation) => `<xhtml:link rel="alternate" hreflang="${LOCALES[translation.language].hreflang}" href="${escapeHtml(translation.url)}"/>`).join('')}</url>`;
  }).join('\n')}\n</urlset>\n`;
}
