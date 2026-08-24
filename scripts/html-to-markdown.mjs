// Minimal HTML -> Markdown converter for the canonical public pages.
//
// It is deliberately narrow: it reads the single <main> landmark that
// scripts/check-seo.mjs already guarantees on every canonical page, and it
// understands only the element vocabulary those pages actually use. Anything
// unrecognised degrades to its text content rather than leaking markup.

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', shy: '',
  mdash: '—', ndash: '–', hellip: '…', laquo: '«', raquo: '»',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  deg: '°', euro: '€', copy: '©', reg: '®', trade: '™', times: '×', middot: '·'
};

function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

function attribute(attrs, name) {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(attrs);
  if (!match) return null;
  return decodeEntities(match[2] ?? match[3] ?? '').trim();
}

function escapeMarkdown(text) {
  // Only the characters that would silently change meaning in running prose.
  return text.replace(/([\\`*_[\]])/g, '\\$1');
}

function collapse(value) {
  return value.replace(/\s+/g, ' ').trim();
}

export function extractMain(html) {
  const match = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  return match ? match[1] : null;
}

export function htmlToMarkdown(fragment, { baseUrl, excludeLinks = [] } = {}) {
  const absolute = (href) => {
    if (!href) return null;
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(href)) return href;
    try {
      return baseUrl ? new URL(href, baseUrl).href : href;
    } catch {
      return href;
    }
  };

  let s = fragment;

  // 1. Discard everything that carries no reading content.
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<(script|style|svg|noscript|template|canvas)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  // <video>/<audio> carry only fallback text for browsers, which is not content.
  s = s.replace(/<(video|audio)\b([^>]*)>([\s\S]*?)<\/\1>/gi, (_m, _tag, attrs, inner) => {
    const src = absolute(attribute(attrs, 'src') || attribute(inner, 'src'));
    return src ? `\n\n[Media](${src})\n\n` : '\n\n';
  });
  s = s.replace(/<(source|track|input|select|option|textarea|label|button)\b[^>]*>/gi, '');
  s = s.replace(/<\/(select|option|textarea|label|button)>/gi, '');
  s = s.replace(/<(form|fieldset)\b[^>]*>|<\/(form|fieldset)>/gi, '\n\n');

  // 2. Media and embeds become links so the reference survives.
  s = s.replace(/<iframe\b([^>]*)>[\s\S]*?<\/iframe>/gi, (_m, attrs) => {
    const src = absolute(attribute(attrs, 'src'));
    const title = attribute(attrs, 'title') || 'Embedded media';
    return src ? `\n\n[${collapse(title)}](${src})\n\n` : '\n\n';
  });
  s = s.replace(/<img\b([^>]*)>/gi, (_m, attrs) => {
    const src = absolute(attribute(attrs, 'src'));
    const alt = collapse(attribute(attrs, 'alt') || '');
    return src ? `\n\n![${alt}](${src})\n\n` : '';
  });

  // 3. Line-level structure.
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');

  // 4. Inline emphasis, innermost first so nesting resolves.
  for (let pass = 0; pass < 3; pass += 1) {
    s = s.replace(/<(strong|b)\b[^>]*>((?:(?!<\1\b)[\s\S])*?)<\/\1>/gi, (_m, _tag, inner) => {
      const text = collapse(stripTags(inner));
      return text ? `**${text}**` : '';
    });
    s = s.replace(/<(em|i)\b[^>]*>((?:(?!<\1\b)[\s\S])*?)<\/\1>/gi, (_m, _tag, inner) => {
      const text = collapse(stripTags(inner));
      return text ? `*${text}*` : '';
    });
  }
  s = s.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_m, inner) => {
    const text = collapse(stripTags(inner));
    return text ? `\`${text}\`` : '';
  });

  // 5. Anchors. Inner block markup is flattened to one line of link text.
  s = s.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_m, attrs, inner) => {
    const href = absolute(attribute(attrs, 'href'));
    const text = collapse(stripTags(inner).replace(/\n+/g, ' '));
    if (!text) return '';
    // Links into authenticated or workflow routes are dropped whole: the label
    // alone ("Manage articles") is noise to a reader who cannot follow it.
    if (href && excludeLinks.some((pattern) => pattern.test(href))) return '';
    return href && !href.startsWith('#') ? `[${text}](${href})` : text;
  });

  // 6. Headings.
  s = s.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level, inner) => {
    const text = collapse(stripTags(inner));
    return text ? `\n\n${'#'.repeat(Number(level))} ${text}\n\n` : '\n\n';
  });

  // 7. Quotes and definition/description pairs.
  s = s.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, inner) => {
    const text = collapse(stripTags(inner));
    return text ? `\n\n> ${text}\n\n` : '\n\n';
  });

  // 8. Lists. Ordered lists are numbered from the surrounding <ol>.
  s = s.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_m, inner) => {
    let index = 0;
    const body = inner.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_li, item) => {
      const text = collapse(stripTags(item));
      if (!isContentful(text)) return '';
      index += 1;
      return `\n${index}. ${text}`;
    });
    return `\n\n${stripTags(body)}\n\n`;
  });
  s = s.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_m, inner) => {
    const text = collapse(stripTags(inner));
    return isContentful(text) ? `\n- ${text}` : '';
  });
  s = s.replace(/<\/?(ul|ol)\b[^>]*>/gi, '\n\n');

  // 9. Remaining block boundaries become paragraph breaks.
  s = s.replace(/<\/(p|div|section|article|header|footer|aside|figure|figcaption|nav|dl|dt|dd|tr|table|tbody|thead|address|details|summary)>/gi, '\n\n');
  s = s.replace(/<(p|div|section|article|header|footer|aside|figure|figcaption|nav|dl|dt|dd|tr|table|tbody|thead|address|details|summary)\b[^>]*>/gi, '\n\n');
  s = s.replace(/<\/?(td|th)\b[^>]*>/gi, ' ');

  // 10. Whatever is left is not content-bearing.
  s = stripTags(s);
  s = decodeEntities(s);

  return normalise(s);
}

// Breadcrumb separators and decorative list items carry no reading content.
function isContentful(text) {
  return /[\p{L}\p{N}]/u.test(text);
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, '');
}

function normalise(value) {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '') + '\n';
}

// Rough parity with the tokenisers used by current assistant models. The
// x-markdown-tokens header is advertised as an estimate, not a contract.
export function estimateTokens(markdown) {
  return Math.max(1, Math.ceil(markdown.length / 4));
}

export { decodeEntities, escapeMarkdown };
