import { LOCALES, PUBLIC_PAGES, SITE_ORIGIN, localizedPages } from './seo-config.mjs';
import { BUSINESS_ALTERNATE_NAMES, BUSINESS_IDENTITY, CONTACT, ENTITY_SUMMARY, ORGANISATION, SERVICES, SERVICE_COVERAGE, SESSION_LANGUAGES } from './agent-config.mjs';

const absolute = (route) => new URL(route, SITE_ORIGIN).href;
const businessId = `${SITE_ORIGIN}/#business`;
const personId = `${SITE_ORIGIN}/#person`;
const websiteId = `${SITE_ORIGIN}/#website`;
const serviceId = (service) => `${SITE_ORIGIN}/#service-${service.id}`;

// Labels that only the generated graph needs. Spanish entries are ready for
// the /es/ pages; until those are published no Spanish page is generated.
const LABELS = {
  'pt-PT': {
    catalog: 'Serviços de Paulo Morais',
    home: 'Início',
    jobTitle: 'Personal Trainer e Osteopata',
    knowsAbout: ['Treino personalizado', 'Treino privado', 'Treino em grupo', 'Treino online', 'Osteopatia', 'Exercício oncológico', 'Exercício depois do cancro', 'Treino de força', 'Mobilidade', 'Postura'],
    oncologyAudience: 'Pessoas a viver com cancro ou depois do tratamento do cancro'
  },
  'en-GB': {
    catalog: 'Paulo Morais services',
    home: 'Home',
    jobTitle: 'Personal Trainer and Osteopath',
    knowsAbout: ['Personal training', 'Private training', 'Group training', 'Online training', 'Osteopathy', 'Cancer exercise', 'Exercise after cancer', 'Strength training', 'Mobility', 'Posture'],
    oncologyAudience: 'People living with cancer or after cancer treatment'
  },
  'es': {
    catalog: 'Servicios de Paulo Morais',
    home: 'Inicio',
    jobTitle: 'Entrenador Personal y Osteópata',
    knowsAbout: ['Entrenamiento personal', 'Entrenamiento privado', 'Entrenamiento en grupo', 'Entrenamiento online', 'Osteopatía', 'Ejercicio oncológico', 'Ejercicio después del cáncer', 'Entrenamiento de fuerza', 'Movilidad', 'Postura'],
    oncologyAudience: 'Personas que viven con cáncer o después del tratamiento del cáncer'
  }
};

const lisbon = { '@type': 'City', name: 'Lisboa', containedInPlace: { '@type': 'Country', name: 'Portugal' } };

// Stable IDs identify one provider across languages and services. A service
// does not become a second business or an oncology medical clinic.
// `faq` holds the question/answer pairs that are visible on the page itself.
export function structuredData(page, { faq = [] } = {}) {
  const locale = page.language;
  const home = LOCALES[locale]?.home ?? '/';
  const languages = [...new Set(PUBLIC_PAGES.map((entry) => entry.language))];
  const text = (translations) => translations[locale] ?? translations[locale.split('-')[0]] ?? translations['pt-PT'];
  const label = LABELS[locale] ?? LABELS[locale.split('-')[0]] ?? LABELS['pt-PT'];
  const serviceNodes = SERVICES.map((service) => ({
    '@type': 'Service',
    '@id': serviceId(service),
    name: text(service.name),
    ...(service.alternateNames ? { alternateName: text(service.alternateNames) } : {}),
    description: text(service.summary),
    serviceType: text(service.name),
    url: service.page[locale] ?? service.page['pt-PT'],
    provider: { '@id': businessId },
    areaServed: [service.coverage?.inPerson, ...(service.coverage?.online ?? [])].filter(Boolean),
    ...(service.id === 'oncology-exercise' ? {
      audience: { '@type': 'PeopleAudience', audienceType: label.oncologyAudience }
    } : {}),
    ...(service.delivery.includes('online') ? {
      availableChannel: {
        '@type': 'ServiceChannel',
        serviceUrl: service.page[locale] ?? service.page['pt-PT'],
        servicePhone: { '@type': 'ContactPoint', telephone: CONTACT.telephone },
        availableLanguage: SESSION_LANGUAGES.offered
      }
    } : {})
  }));
  const service = SERVICES.find((entry) => entry.page[locale] === absolute(page.path));
  const isProfile = page.translationKey === 'about';
  const isBlog = page.translationKey === 'blog';
  const faqId = `${absolute(page.path)}#faq`;
  const pageNode = {
    '@type': isProfile ? 'ProfilePage' : isBlog ? 'CollectionPage' : 'WebPage',
    '@id': `${absolute(page.path)}#webpage`,
    url: absolute(page.path),
    name: page.title,
    description: page.description,
    inLanguage: locale,
    isPartOf: { '@id': websiteId },
    publisher: { '@id': businessId },
    about: { '@id': service ? serviceId(service) : businessId },
    ...(service || isProfile ? { mainEntity: { '@id': isProfile ? personId : serviceId(service) } } : {}),
    ...(faq.length ? { hasPart: { '@id': faqId } } : {}),
    workTranslation: localizedPages(page).filter((entry) => entry.path !== page.path)
      .map((entry) => ({ '@id': `${absolute(entry.path)}#webpage` }))
  };
  const graph = [
    {
      '@type': 'LocalBusiness',
      '@id': businessId,
      name: ORGANISATION.brand,
      alternateName: BUSINESS_ALTERNATE_NAMES,
      slogan: 'Your Own Workout',
      url: `${SITE_ORIGIN}/`,
      description: text(ENTITY_SUMMARY),
      telephone: CONTACT.telephone,
      email: CONTACT.email,
      logo: `${SITE_ORIGIN}/images/logo/paulo_morais-08.png`,
      image: `${SITE_ORIGIN}/images/sobre-mim/paulo-morais.png`,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Lisboa',
        addressRegion: 'Lisboa',
        addressCountry: 'PT'
      },
      areaServed: [lisbon, ...SERVICE_COVERAGE.online],
      knowsLanguage: SESSION_LANGUAGES.offered,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        telephone: CONTACT.telephone,
        email: CONTACT.email,
        availableLanguage: SESSION_LANGUAGES.offered,
        areaServed: SERVICE_COVERAGE.online
      },
      sameAs: [CONTACT.instagram],
      founder: { '@id': personId },
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: label.catalog,
        itemListElement: SERVICES.map((entry) => ({
          '@type': 'Offer', itemOffered: { '@id': serviceId(entry) }
        }))
      }
    },
    {
      '@type': 'Person',
      '@id': personId,
      name: 'Paulo Morais',
      alternateName: ORGANISATION.practitioner,
      jobTitle: label.jobTitle,
      description: text(ENTITY_SUMMARY),
      url: absolute(PUBLIC_PAGES.find((entry) => entry.translationKey === 'about' && entry.language === locale)?.path ?? '/sobre-mim'),
      image: `${SITE_ORIGIN}/images/sobre-mim/paulo-morais.png`,
      sameAs: [CONTACT.instagram],
      worksFor: { '@id': businessId },
      workLocation: lisbon,
      knowsLanguage: SESSION_LANGUAGES.offered,
      knowsAbout: label.knowsAbout
    },
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: `${SITE_ORIGIN}/`,
      name: ORGANISATION.brand,
      alternateName: 'Paulo Morais',
      description: text(BUSINESS_IDENTITY),
      inLanguage: languages,
      publisher: { '@id': businessId }
    },
    ...serviceNodes,
    pageNode
  ];
  if (faq.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': faqId,
      url: absolute(page.path),
      inLanguage: locale,
      isPartOf: { '@id': `${absolute(page.path)}#webpage` },
      mainEntity: faq.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer }
      }))
    });
  }
  if (page.translationKey !== 'home') {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${absolute(page.path)}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: label.home, item: absolute(home) },
        { '@type': 'ListItem', position: 2, name: page.title.split(' | ')[0], item: absolute(page.path) }
      ]
    });
    pageNode.breadcrumb = { '@id': `${absolute(page.path)}#breadcrumb` };
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
