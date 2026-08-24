# auth.md

Agent registration and authentication for https://pmorais.pt, operated by
Consciênciavaliativa Unipessoal Lda (VAT PT517409241), Lisbon, Portugal.

This document follows the auth.md procedural shape — discover, register, claim,
exchange, use, revoke — and answers each step for this service. Several of the
answers are "not offered". They are stated explicitly so an agent can stop
early instead of probing for endpoints that do not exist.

## Audience

Autonomous agents and assistants acting for a person who wants information
about, or contact with, Paulo Morais — Your Own Workout: personal training, online
training, adapted exercise in oncology, and osteopathy.

## Declared posture

```json
{
  "agent_auth": {
    "skill": "https://pmorais.pt/auth.md",
    "registration": "none",
    "register_uri": null,
    "identity_endpoint": null,
    "claim_uri": null,
    "revocation_uri": null,
    "identity_types_supported": [],
    "credential_types_supported": [],
    "events_supported": [],
    "public_api": "https://pmorais.pt/api/v1/",
    "public_api_authentication": "none",
    "mcp_endpoint": "https://pmorais.pt/mcp",
    "mcp_authentication": "none",
    "human_provisioning": "mailto:pt@pmorais.pt"
  }
}
```

That block is a declaration of posture, not authorization server metadata. It is
embedded here rather than at `/.well-known/oauth-authorization-server`
precisely because this service is not an authorization server.

## Step 1 — Discover

| Document | Status |
| --- | --- |
| `/.well-known/oauth-protected-resource` | **Not published.** No resource on this origin is protected by a bearer token, so there is no protected resource to describe. RFC 9728 has no way to say "nothing here is OAuth-protected"; this document says it instead. |
| `/.well-known/oauth-authorization-server` | **Not published.** This origin issues no tokens. |
| `/.well-known/openid-configuration` | **Not published.** This origin is not an OpenID provider. |
| `/.well-known/api-catalog` | Published. RFC 9727 linkset for the public API and the MCP endpoint. |
| `/.well-known/mcp/server-card.json` | Published. The MCP server is anonymous — `authentication.type` is `none`. |
| `/openapi.json` | Published. Every operation is anonymous. |
| `/.well-known/ai-catalog.json` | Published. ARD capability manifest. |

No endpoint on https://pmorais.pt returns `401` with a
`WWW-Authenticate: Bearer resource_metadata=…` challenge, because no endpoint
here accepts a bearer token.

## Step 2 — Register

**Agent registration is not offered. There is no registration endpoint.**

- `register_uri`: none
- Identity assertion (ID-JAG, `urn:ietf:params:oauth:token-type:id-jag`): not accepted
- Verified email: not accepted
- Anonymous agent credentials: not issued
- Dynamic client registration (RFC 7591): not supported

There is nothing to register *for*. The public API below is open, and the only
other surface is a personal client area that is deliberately closed to agents.

The one provisioning path that exists is out of band and human-mediated: a
person emails pt@pmorais.pt and arranges matters directly with Paulo Morais.
An agent may surface that address to the person it is helping. It may not
complete the exchange on their behalf.

## Steps 3–5 — Claim, exchange, use

Not applicable. No claim ceremony (RFC 8628 style or otherwise), no token
exchange (RFC 7523 or otherwise), and no credential to use.

Use the public surface directly instead. Plain `GET`, no token, no header
negotiation. Please send a descriptive `User-Agent`.

- `https://pmorais.pt/api/v1/site.json`
- `https://pmorais.pt/api/v1/services.json`
- `https://pmorais.pt/api/v1/contact.json`
- `https://pmorais.pt/api/v1/pages.json`
- `https://pmorais.pt/api/v1/status.json`
- `https://pmorais.pt/openapi.json`
- Any canonical page with `Accept: text/markdown`

The MCP server at `https://pmorais.pt/mcp` is part of that same anonymous
surface. It speaks streamable HTTP, accepts `POST` with a JSON-RPC 2.0 body,
and never asks for a credential. It returns `401` to nobody, because it
authenticates nobody. Its tools are read-only and cover the same published
content: `list_services`, `get_contact_details`, `list_pages`, `read_page`, `search_site`.

## Step 6 — Revoke

Not applicable; nothing is issued. No `revocation_uri`, no revocation events.

## The closed surface

The client area — bookings, history, forms, profiles, administration — is
protected by Firebase Authentication and is **human-only**. Sessions are
established interactively by the account holder in a browser. There is no
client-credentials flow, no service account, no API key, and no delegated agent
identity. It holds personal health information, which is why no agent-delegated
access path is published rather than merely undocumented.

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
