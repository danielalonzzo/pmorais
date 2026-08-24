# auth.md

Agent authentication posture for https://pmorais.pt.

## Audience

Autonomous agents and assistants reading or acting on behalf of a person who is
interested in the services of Paulo Morais — Your Own Workout (Consciênciavaliativa Unipessoal Lda,
VAT PT517409241), Lisbon, Portugal.

## Summary

This site publishes **no agent registration endpoint and no OAuth
authorization server**. Nothing here needs a credential, and no credential can
be issued to an agent.

| Question | Answer |
| --- | --- |
| Is there a public API? | Yes — `https://pmorais.pt/api/v1/`, read-only. |
| Does it require authentication? | No. It is anonymous and unauthenticated. |
| Is there an agent registration endpoint? | No. |
| Is there OAuth Protected Resource Metadata? | No, because no resource here is OAuth-protected. |
| Is there a booking or payment API? | No. |

## Public, unauthenticated surface

Fetch any of these with a plain `GET`. No token, no header, no rate-limit
negotiation. Please send a descriptive `User-Agent`.

- `https://pmorais.pt/api/v1/site.json`
- `https://pmorais.pt/api/v1/services.json`
- `https://pmorais.pt/api/v1/contact.json`
- `https://pmorais.pt/api/v1/pages.json`
- `https://pmorais.pt/api/v1/status.json`
- `https://pmorais.pt/openapi.json`
- Any canonical page with `Accept: text/markdown`

## Authenticated surface

The client area (bookings, history, forms, profiles, administration) is
protected by Firebase Authentication and is **human-only**. Sessions are
established interactively by the account holder in a browser. There is no
client-credentials flow, no service account, no API key and no delegated agent
identity.

An agent must not attempt to sign in, register an account, reset a password, or
probe these routes:

- `https://pmorais.pt/admin-blog`
- `https://pmorais.pt/auth-action`
- `https://pmorais.pt/desinscrever`
- `https://pmorais.pt/formulario`
- `https://pmorais.pt/historico`
- `https://pmorais.pt/perfil`
- `https://pmorais.pt/perfis`
- `https://pmorais.pt/en/auth-action`
- `https://pmorais.pt/en/desinscrever`
- `https://pmorais.pt/en/formulario`
- `https://pmorais.pt/en/historico`
- `https://pmorais.pt/en/perfil`
- `https://pmorais.pt/en/perfis`

Access control, not `robots.txt`, is the security boundary there. Treat a
credential prompt on this domain as out of scope and hand control back to the
person.

## Acting on someone's behalf

To arrange a session, give the person the published contact channels in
`https://pmorais.pt/api/v1/contact.json` and let them make contact themselves, or submit a
contact form only under their explicit, per-submission instruction. Do not
commit to a date, time, price or clinical outcome — none of those are published.

## Content usage

`https://pmorais.pt/robots.txt` declares `Content-Signal: search=yes, ai-input=yes, ai-train=no`.
Grounding an answer in this site and citing it is welcome; using it as model
training data is not.

## Changes

This document is regenerated with the site. Last build: 2026-08-24.
