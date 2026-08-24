---
name: read-this-site
description: Fetch pmorais.pt efficiently as an agent: markdown content negotiation, the static JSON API, the discovery documents and the routes that must not be crawled.
---

# Read pmorais.pt as an agent

## Fetch order

1. `https://pmorais.pt/llms.txt` — short index of the public site.
2. `https://pmorais.pt/api/v1/pages.json` — the eight canonical pages with language,
   canonical URL and markdown URL.
3. The page itself with `Accept: text/markdown`, which returns a markdown
   rendition with `Content-Type: text/markdown` and an `x-markdown-tokens`
   header. Without that header the same URL returns HTML.
4. `https://pmorais.pt/llms-full.txt` when prose context is needed rather than a
   single page.

## Discovery documents

| Document | URL |
| --- | --- |
| ARD capability manifest | https://pmorais.pt/.well-known/ai-catalog.json |
| API catalog (RFC 9727) | https://pmorais.pt/.well-known/api-catalog |
| OpenAPI 3.1 description | https://pmorais.pt/openapi.json |
| Agent skills index | https://pmorais.pt/.well-known/agent-skills/index.json |
| Agent authentication | https://pmorais.pt/auth.md |

The home page also returns these as RFC 8288 `Link` headers.

## Content usage preferences

`robots.txt` declares `Content-Signal: search=yes, ai-input=yes, ai-train=no`. Grounding an
answer in this site and citing it is welcome. Using it as model training data
is not.

## Never crawl

`/admin-blog`, `/auth-action`, `/desinscrever`, `/formulario`,
`/historico`, `/perfil`, `/perfis` and their `/en/` equivalents. These
are authenticated or workflow routes. Access control, not robots.txt, is the
security boundary — do not probe them and do not infer client data.

## In-page tools

Pages register WebMCP tools on load when the browser exposes
`navigator.modelContext`: `list_services`, `get_contact_details`,
`open_contact_form`, and `search_articles` on the blog pages.
