import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, test } from 'node:test';
import { ASSET_VERSION, LOCALES, PLANNED_SPANISH_PATHS, PUBLIC_PAGES, SITE_ORIGIN, assertPublicPages, localizedPages, pageAlternates } from '../scripts/seo-config.mjs';
import { SERVICES, SERVICE_COVERAGE, SESSION_LANGUAGES } from '../scripts/agent-config.mjs';
import { structuredData } from '../scripts/structured-data.mjs';
import { buildArticleDocuments, writeArticleExport } from '../scripts/export-public-articles.mjs';

const absolute = (pathname) => new URL(pathname, SITE_ORIGIN).href;
const entityId = (name) => `${SITE_ORIGIN}/#${name}`;
const pageFor = (translationKey, language) => PUBLIC_PAGES.find((page) => page.translationKey === translationKey && page.language === language);
const nodeFor = (graph, id) => graph.find((node) => node['@id'] === id);

describe('Published SEO registry', () => {
  test('accepts the current public registry and rejects ambiguous canonicals', () => {
    assert.doesNotThrow(() => assertPublicPages());
    const page = pageFor('home', 'pt-PT');
    for (const pathname of ['', '//another.example/', '/index.html', '/?language=pt', '/#services']) {
      assert.throws(() => assertPublicPages([{ ...page, path: pathname }]), /canonical path/);
    }
    assert.throws(() => assertPublicPages([{ ...page, title: '' }]), /incomplete SEO metadata/);
    assert.throws(() => assertPublicPages([page, { ...page, file: 'other.html', path: '/other' }]), /duplicate/);
    assert.throws(() => assertPublicPages([page, { ...page, translationKey: 'other', path: '/other' }]), /duplicate/);
    assert.throws(() => assertPublicPages([page, { ...page, translationKey: 'other', file: 'other.html' }]), /duplicate/);
  });

  test('publishes reciprocal Spanish alternates only after registration and locale activation', () => {
    const home = pageFor('home', 'pt-PT');
    const spanish = {
      ...home,
      file: 'es/index.html',
      path: PLANNED_SPANISH_PATHS.home,
      language: 'es',
      title: 'Paulo Morais | Entrenador personal y osteópata en Lisboa',
      description: 'Entrenamiento personal, en grupo y online, osteopatía y ejercicio después del cáncer con Paulo Morais.'
    };
    const originalPublished = LOCALES.es.published;
    const originalPages = [...PUBLIC_PAGES];
    // Only imported objects are changed. No translation or generated file is
    // written, and finally restores shared module state even after a failure.
    try {
      LOCALES.es.published = false;
      // The simulation also remains usable after Spanish is launched: replace
      // its existing home temporarily instead of registering a duplicate.
      for (let index = PUBLIC_PAGES.length - 1; index >= 0; index--) {
        if (PUBLIC_PAGES[index].translationKey === 'home' && PUBLIC_PAGES[index].language === 'es') PUBLIC_PAGES.splice(index, 1);
      }
      PUBLIC_PAGES.push(spanish);
      assert.throws(() => assertPublicPages(), /not published/);
      assert(!localizedPages(home).includes(spanish));
      assert(!pageAlternates(home).some((alternate) => alternate.language === 'es'));
      const draftGraph = structuredData(home)['@graph'];
      assert(!nodeFor(draftGraph, `${absolute(home.path)}#webpage`).workTranslation
        .some((translation) => translation['@id'] === `${absolute(spanish.path)}#webpage`));

      LOCALES.es.published = true;
      assert.doesNotThrow(() => assertPublicPages());
      assert(localizedPages(home).includes(spanish));
      for (const translatedPage of localizedPages(home)) {
        const alternates = pageAlternates(translatedPage);
        assert(alternates.some((alternate) => alternate.language === 'es' && alternate.path === '/es/'));
        assert(alternates.some((alternate) => alternate.language === 'pt' && alternate.path === '/'));
        assert(alternates.some((alternate) => alternate.language === 'en' && alternate.path === '/en/'));
        assert.equal(alternates.find((alternate) => alternate.language === 'x-default').path, '/');
      }
      assert.throws(() => assertPublicPages([{ ...spanish, path: '/es/inicio' }]), /reserved translation path/);
      const graph = structuredData(spanish)['@graph'];
      const page = nodeFor(graph, `${absolute(spanish.path)}#webpage`);
      assert.equal(page.inLanguage, 'es');
      assert.equal(page.mainEntity['@id'], entityId('business'));
      assert(page.workTranslation.some((translation) => translation['@id'] === `${absolute(home.path)}#webpage`));
      assert(nodeFor(graph, entityId('website')).inLanguage.includes('es'));
    } finally {
      LOCALES.es.published = originalPublished;
      PUBLIC_PAGES.splice(0, PUBLIC_PAGES.length, ...originalPages);
    }
  });
});

describe('Provider and service identity', () => {
  test('keeps one provider and the complete service catalogue across both languages', () => {
    const expectedServices = ['personal-training', 'group-training', 'online-training', 'oncology-exercise', 'osteopathy'];
    assert.deepEqual(SERVICES.map((service) => service.id).sort(), [...expectedServices].sort());
    for (const page of PUBLIC_PAGES) {
      const graph = structuredData(page)['@graph'];
      assert.equal(new Set(graph.map((node) => node['@id'])).size, graph.length);
      const business = nodeFor(graph, entityId('business'));
      assert.equal(business['@type'], 'LocalBusiness');
      assert.equal(graph.filter((node) => node['@type'] === 'LocalBusiness').length, 1);
      assert.deepEqual(business.hasOfferCatalog.itemListElement.map((offer) => offer.itemOffered['@id']).sort(),
        expectedServices.map((id) => entityId(`service-${id}`)).sort());
      assert(!graph.some((node) => ['MedicalClinic', 'Oncologist', 'Hospital'].includes(node['@type'])));
      for (const service of SERVICES) {
        const node = nodeFor(graph, entityId(`service-${service.id}`));
        assert.equal(node.provider['@id'], entityId('business'));
        assert.equal(node.url, service.page[page.language] ?? service.page['pt-PT']);
        const expectedPages = Object.values(service.page).map((url) => `${url}#webpage`).sort();
        assert.deepEqual(node.subjectOf.map((reference) => reference['@id']).sort(), expectedPages);
      }
    }
  });

  test('connects home, practitioner biographies and the personal training service without creating a second provider', () => {
    for (const language of ['pt-PT', 'en-GB']) {
      const home = pageFor('home', language);
      const homeGraph = structuredData(home)['@graph'];
      assert.equal(nodeFor(homeGraph, `${absolute(home.path)}#webpage`).mainEntity['@id'], entityId('business'));
      const profile = pageFor('about', language);
      const profileGraph = structuredData(profile)['@graph'];
      const profileNode = nodeFor(profileGraph, `${absolute(profile.path)}#webpage`);
      assert.equal(profileNode['@type'], 'ProfilePage');
      assert.equal(profileNode.mainEntity['@id'], entityId('person'));
      assert(profileNode.about.some((reference) => reference['@id'] === entityId('service-personal-training')));
      const person = nodeFor(profileGraph, entityId('person'));
      assert.equal(person.worksFor['@id'], entityId('business'));
      assert(person.mainEntityOfPage.some((reference) => reference['@id'] === profileNode['@id']));
    }
  });

  test('attaches international delivery to online exercise while keeping osteopathy in Lisbon', () => {
    const graph = structuredData(pageFor('home', 'pt-PT'))['@graph'];
    const osteopathy = nodeFor(graph, entityId('service-osteopathy'));
    assert.deepEqual(osteopathy.areaServed, [SERVICE_COVERAGE.inPerson]);
    assert.equal(osteopathy.availableChannel, undefined);
    const online = nodeFor(graph, entityId('service-online-training'));
    assert.deepEqual(online.areaServed, SERVICE_COVERAGE.online);
    for (const id of ['online-training', 'oncology-exercise']) {
      const service = nodeFor(graph, entityId(`service-${id}`));
      assert.equal(service.availableChannel.providesService['@id'], service['@id']);
      assert.deepEqual(service.availableChannel.availableLanguage, SESSION_LANGUAGES.offered);
    }
  });
});

function languageHarness(script, {
  pathname,
  search = '',
  hash = '',
  hostname = 'pmorais.pt',
  alternates = [],
  browserLanguage = 'en-US',
  storedLanguage = 'en'
}) {
  const navigations = [];
  const storageWrites = [];
  const location = { pathname, search, hash, hostname };
  Object.defineProperty(location, 'href', {
    get: () => `https://${hostname}${pathname}${search}${hash}`,
    set: (value) => navigations.push(value)
  });
  location.assign = (value) => navigations.push(value);
  location.replace = (value) => navigations.push(value);
  const storage = new Map([['pm_lang_pref', storedLanguage]]);
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => { storage.set(key, value); storageWrites.push([key, value]); }
  };
  const navigator = { language: browserLanguage, languages: [browserLanguage] };
  const document = {
    querySelectorAll: (selector) => {
      assert.equal(selector, 'link[rel="alternate"][hreflang]');
      return alternates.map(({ language, path }) => ({ hreflang: language, href: absolute(path) }));
    }
  };
  const window = { location, navigator, localStorage };
  vm.runInNewContext(script, { URL, window, document, navigator, localStorage }, { timeout: 1000 });
  return { window, navigations, storageWrites };
}

const bilingualAlternates = (page) => pageAlternates(page)
  .filter((alternate) => ['pt', 'en', 'x-default'].includes(alternate.language));

for (const relative of ['../js/lang.js', '../en/js/lang.js']) {
  const script = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
  describe(`Visitor language routing: ${relative}`, () => {
    test('does not redirect a canonical URL because of browser language or a stored preference', () => {
      const state = languageHarness(script, { pathname: '/sobre-mim', hash: '#treino-personalizado' });
      assert.deepEqual(state.navigations, []);
      assert.deepEqual(state.storageWrites, []);
      assert.equal(typeof state.window.toggleLanguage, 'function');
    });

    test('preserves the personal training section and query string when switching PT to EN', () => {
      const state = languageHarness(script, {
        pathname: '/sobre-mim', search: '?source=service', hash: '#treino-personalizado',
        alternates: bilingualAlternates(pageFor('about', 'pt-PT'))
      });
      state.window.toggleLanguage();
      assert.deepEqual(state.navigations, ['/en/sobre-mim?source=service#personal-training']);
      assert.deepEqual(state.storageWrites, [['pm_lang_pref', 'en']]);
    });

    test('preserves the personal training section and query string when switching EN to PT', () => {
      const state = languageHarness(script, {
        pathname: '/en/sobre-mim', search: '?source=service', hash: '#personal-training',
        alternates: bilingualAlternates(pageFor('about', 'en-GB'))
      });
      state.window.toggleLanguage();
      assert.deepEqual(state.navigations, ['/sobre-mim?source=service#treino-personalizado']);
      assert.deepEqual(state.storageWrites, [['pm_lang_pref', 'pt']]);
    });

    test('uses a published Spanish alternate and clears a section without a Spanish equivalent', () => {
      const alternates = [
        { language: 'pt', path: '/sobre-mim' },
        { language: 'en', path: '/en/sobre-mim' },
        { language: 'es', path: '/es/sobre-mi' },
        { language: 'x-default', path: '/sobre-mim' }
      ];
      const state = languageHarness(script, {
        pathname: '/en/sobre-mim', search: '?source=service', hash: '#personal-training', alternates
      });
      assert.deepEqual(state.navigations, []);
      state.window.toggleLanguage();
      assert.deepEqual(state.navigations, ['/es/sobre-mi?source=service']);
      assert.deepEqual(state.storageWrites, [['pm_lang_pref', 'es']]);
      const spanish = languageHarness(script, { pathname: '/es/sobre-mi', alternates });
      spanish.window.toggleLanguage();
      assert.deepEqual(spanish.navigations, ['/sobre-mim']);
    });

    test('uses real .html files on a static development server', () => {
      for (const hostname of ['127.0.0.1', 'localhost']) {
        const state = languageHarness(script, {
          pathname: '/sobre-mim.html', search: '?source=service', hash: '#treino-personalizado', hostname
        });
        state.window.toggleLanguage();
        assert.deepEqual(state.navigations, ['/en/sobre-mim.html?source=service#personal-training']);
      }
    });

    test('translates known home sections and preserves shared fragment identifiers', () => {
      for (const [before, after] of [['#servicos', '#services'], ['#perguntas', '#questions'], ['#shared-anchor', '#shared-anchor']]) {
        const state = languageHarness(script, { pathname: '/', hash: before });
        state.window.toggleLanguage();
        assert.deepEqual(state.navigations, [`/en/${after}`]);
      }
    });

    test('retains authentication parameters on a workflow route without public alternates', () => {
      const state = languageHarness(script, {
        pathname: '/auth-action', search: '?mode=resetPassword&oobCode=test-code', hash: '#form'
      });
      state.window.toggleLanguage();
      assert.deepEqual(state.navigations, ['/en/auth-action?mode=resetPassword&oobCode=test-code#form']);
    });
  });
}

function publicPost(id, data = {}, { project = 'paulo-morais', collection = 'blog_posts' } = {}) {
  const fields = {
    published: true,
    title_pt: `Título sintético ${id}`,
    content_pt: `<p>Texto público sintético ${id}.</p>`,
    createdAt: '2026-10-01T12:00:00.000Z',
    ...data
  };
  return {
    document: {
      name: `projects/${project}/databases/(default)/documents/${collection}/${id}`,
      updateTime: '2026-10-09T12:00:00.000Z',
      fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key,
        typeof value === 'boolean' ? { booleanValue: value } : { stringValue: value }]))
    }
  };
}

function exporterWorkspace(t) {
  const root = fs.mkdtempSync('/private/tmp/pmorais-seo-export-test-');
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'en'), { recursive: true });
  for (const file of ['blog.html', 'en/blog.html']) {
    fs.writeFileSync(path.join(root, file), '<!doctype html><html><head><title>Synthetic blog fixture</title></head><body><main><div class="blog-container"></div></main></body></html>');
  }
  return root;
}

const exportOptions = (root) => ({ root, assetVersion: ASSET_VERSION, generatedAt: '2026-10-10T12:00:00.000Z' });

function outputSnapshot(root) {
  const output = {};
  function visit(directory, prefix = '') {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const relative = path.posix.join(prefix, entry.name);
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file, relative);
      else output[relative] = fs.readFileSync(file, 'utf8');
    }
  }
  visit(root);
  return output;
}

function articleSchema(html) {
  const block = /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  assert(block, 'The static article must include structured data');
  return JSON.parse(block[1]);
}

describe('Published article exporter', () => {
  test('exports only genuine source languages and strictly published public documents', () => {
    const articles = buildArticleDocuments([
      publicPost('pt-only', { title_en: 'Empty English editor', content_en: '<p><br></p>', summary_en: '<p>&nbsp;</p>' }),
      publicPost('both', { title_en: 'Synthetic English title', content_en: '<p>Synthetic English body.</p>' }),
      publicPost('draft', { published: false }),
      publicPost('string-published', { published: 'true' })
    ]);
    assert.deepEqual(articles.map((article) => `${article.id}:${article.language}`).sort(),
      ['both:en-GB', 'both:pt-PT', 'pt-only:pt-PT']);
    assert.equal(articles.find((article) => article.language === 'en-GB').path, '/en/articles/both');
    assert.equal(articles.find((article) => article.id === 'pt-only').path, '/artigos/pt-only');
    assert(!articles.some((article) => article.path.includes('/es/')));
    assert.throws(() => buildArticleDocuments([publicPost('foreign', {}, { project: 'private-project' })]), /document path|public blog_posts/);
    assert.throws(() => buildArticleDocuments([publicPost('private', {}, { collection: 'client_profiles' })]), /document path|public blog_posts/);
    assert.throws(() => buildArticleDocuments([publicPost('../outside')]), /document path|public blog_posts/);
    assert.throws(() => buildArticleDocuments([publicPost('duplicate'), publicPost('duplicate')]), /Duplicate/);
  });

  test('keeps readable article bodies and real translation links in the initial HTML', (t) => {
    const root = exporterWorkspace(t);
    const manifest = writeArticleExport([
      publicPost('static-body', {
        title_pt: 'Título público sintético', content_pt: '<p>SYNTHETIC_PT_BODY_WITHOUT_JAVASCRIPT</p>',
        title_en: 'Synthetic public title', content_en: '<p>SYNTHETIC_EN_BODY_WITHOUT_JAVASCRIPT</p>'
      })
    ], exportOptions(root));
    assert.equal(manifest.count, 2);
    for (const [language, file, body, hreflang] of [
      ['pt-PT', 'artigos/static-body.html', 'SYNTHETIC_PT_BODY_WITHOUT_JAVASCRIPT', 'en'],
      ['en-GB', 'en/articles/static-body.html', 'SYNTHETIC_EN_BODY_WITHOUT_JAVASCRIPT', 'pt']
    ]) {
      const html = fs.readFileSync(path.join(root, file), 'utf8');
      const visible = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
      const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(visible)?.[1] ?? '';
      assert(main.includes(`<p>${body}</p>`), 'The body must be present independently of script execution');
      assert(html.includes(`<html lang="${language}">`));
      assert(html.includes(`hreflang="${hreflang}"`));
      assert(!html.includes('hreflang="es"'));
      assert.equal(articleSchema(html).inLanguage, language);
    }
    const blogPt = fs.readFileSync(path.join(root, 'blog.html'), 'utf8');
    const blogEn = fs.readFileSync(path.join(root, 'en/blog.html'), 'utf8');
    assert(blogPt.includes('href="/artigos/static-body"'));
    assert(blogEn.includes('href="/en/articles/static-body"'));
  });

  test('does not turn an uploaded PDF publishing credit into scientific authorship', (t) => {
    const root = exporterWorkspace(t);
    const originalDocument = 'https://research.example.org/synthetic-publication.pdf';
    const manifest = writeArticleExport([
      publicPost('pdf-reference', {
        format: 'pdf', author: 'Synthetic uploader', pdfUrl: originalDocument,
        content_pt: '<p><br></p>', summary_pt: '<p>SYNTHETIC_PUBLIC_PDF_SUMMARY</p>',
        title_en: 'Untranslated PDF', content_en: '<p><br></p>', summary_en: '<p><br></p>'
      })
    ], exportOptions(root));
    assert.equal(manifest.count, 1);
    const html = fs.readFileSync(path.join(root, 'artigos/pdf-reference.html'), 'utf8');
    const schema = articleSchema(html);
    assert.equal(schema.author, undefined);
    assert.equal(schema.citation, originalDocument);
    assert.equal(schema.publisher.name, 'Paulo Morais — Your Own Workout');
    const withoutScripts = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');
    assert(withoutScripts.includes('<p>SYNTHETIC_PUBLIC_PDF_SUMMARY</p>'));
    assert(withoutScripts.includes(`href="${originalDocument}"`));
    assert(!fs.existsSync(path.join(root, 'en/articles/pdf-reference.html')));
  });

  test('preserves every existing output on malformed, error or unexpectedly empty snapshots', (t) => {
    const root = exporterWorkspace(t);
    writeArticleExport([publicPost('existing')], exportOptions(root));
    const before = outputSnapshot(root);
    const invalidSnapshots = [
      { error: 'not a query array' },
      [null],
      [{}],
      [{ error: { message: 'PERMISSION_DENIED' } }],
      [publicPost('foreign', {}, { project: 'private-project' })],
      [],
      [{ readTime: '2026-10-10T12:00:00.000Z' }],
      [publicPost('unpublished', { published: false })]
    ];
    for (const snapshot of invalidSnapshots) {
      assert.throws(() => writeArticleExport(snapshot, exportOptions(root)));
      assert.deepEqual(outputSnapshot(root), before, 'A rejected export must leave existing files byte-for-byte intact');
    }
  });

  test('validates old manifest paths and blog insertion before replacing any output', (t) => {
    const root = exporterWorkspace(t);
    writeArticleExport([publicPost('existing')], exportOptions(root));
    const manifestFile = path.join(root, 'api/v1/articles.json');
    const validManifest = fs.readFileSync(manifestFile, 'utf8');
    fs.writeFileSync(manifestFile, JSON.stringify({ articles: [{ path: '/../../outside' }] }));
    const unsafeBefore = outputSnapshot(root);
    assert.throws(() => writeArticleExport([publicPost('replacement')], exportOptions(root)), /Unsafe path/);
    assert.deepEqual(outputSnapshot(root), unsafeBefore);
    fs.writeFileSync(manifestFile, validManifest);
    fs.writeFileSync(path.join(root, 'en/blog.html'), '<main></main>');
    const malformedBlogBefore = outputSnapshot(root);
    assert.throws(() => writeArticleExport([publicPost('replacement')], exportOptions(root)), /insertion point/);
    assert.deepEqual(outputSnapshot(root), malformedBlogBefore);
  });

  test('removes withdrawn translations and obsolete exports while preserving unrelated files', (t) => {
    const root = exporterWorkspace(t);
    writeArticleExport([
      publicPost('retained', { title_en: 'Synthetic English title', content_en: '<p>Synthetic English body.</p>' }),
      publicPost('withdrawn')
    ], exportOptions(root));
    const unrelated = path.join(root, 'artigos/unrelated-editorial.html');
    fs.writeFileSync(unrelated, 'Unrelated local file');
    const manifest = writeArticleExport([publicPost('retained')], exportOptions(root));
    assert.equal(manifest.count, 1);
    assert.deepEqual(manifest.articles.map((article) => article.language), ['pt-PT']);
    assert(fs.existsSync(path.join(root, 'artigos/retained.html')));
    assert(!fs.existsSync(path.join(root, 'artigos/withdrawn.html')));
    assert(!fs.existsSync(path.join(root, 'en/articles/retained.html')));
    assert.equal(fs.readFileSync(unrelated, 'utf8'), 'Unrelated local file');
    const sitemap = fs.readFileSync(path.join(root, 'sitemap-articles.xml'), 'utf8');
    assert(sitemap.includes(`${SITE_ORIGIN}/artigos/retained`));
    assert(!sitemap.includes('/artigos/withdrawn'));
    assert(!sitemap.includes('/en/articles/retained'));
    assert(!fs.readFileSync(path.join(root, 'en/blog.html'), 'utf8').includes('/en/articles/retained'));
  });
});
