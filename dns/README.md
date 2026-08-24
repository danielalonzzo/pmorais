# Publishing the DNS-AID records for pmorais.pt

The records themselves are in [dns-aid.zone](dns-aid.zone), generated from
`scripts/agent-config.mjs`. They cannot be applied from this repository —
pmorais.pt is served by ns1/ns2/ns3.dnscpanel.com, so publishing is a
change in the hosting provider's DNS, and DNSSEC signing needs both the DNS
host and the registrar.

## What is being published, and why only this

- `_index._agents.pmorais.pt` — Well-known entrypoint. Resolves to the origin that serves the ARD manifest, the RFC 9727 API catalog and the OpenAPI description.
- `_mcp._agents.pmorais.pt` — Read-only MCP server (streamable HTTP at https://pmorais.pt/mcp). Anonymous; no credential is issued or accepted.
- `_catalog._agents.pmorais.pt` — ARD capability manifest pointer (agenticresourcediscovery.org §6.1).

Nothing else. In particular there is no `_a2a._agents` record, because there
is no A2A agent behind this domain. Advertising an endpoint in DNS that does not
answer wastes every resolver that trusts it. Add the record to
`scripts/agent-config.mjs` and regenerate the day the endpoint exists.

## Step 1 — the TXT record (publishable today, anywhere)

`_catalog._agents.pmorais.pt` is a plain TXT record. Every DNS provider
supports TXT, including cPanel's Zone Editor, and it satisfies the ARD spec's
DNS discovery mechanism on its own.

In cPanel: **Zone Editor → Manage → Add Record → TXT**, with the name and value
from `dns-aid.zone`.

## Step 2 — the SVCB records

`_index._agents.pmorais.pt` and `_mcp._agents.pmorais.pt` need SVCB
records, DNS RR type 64. cPanel's Zone Editor does not offer type 64 in its
record-type list in most builds, and type 65 (HTTPS) only in recent ones. Two
ways forward:

1. **Ask the provider.** Send flesk.com the SVCB lines from `dns-aid.zone`
   verbatim and ask for them to be added to the zone. If they can only do type
   65, ask for the commented HTTPS lines instead — publish one form or the
   other, never both.
2. **Move DNS to a provider that supports it.** Cloudflare's free tier accepts
   SVCB and HTTPS records directly and turns on DNSSEC with one click, which
   also settles step 3. Nameserver delegation changes at the registrar; the
   hosting itself does not move.

## Step 3 — DNSSEC

The draft asks for the discovery zone to be signed so validating resolvers
return authenticated data. `pmorais.pt` is currently unsigned — there is
no DS record at the `.pt` parent and no DNSKEY in the zone.

With cPanel as the DNS host: **Zone Editor → DNSSEC → Create Key**, then copy
the generated DS record to the domain registrar. Propagation to the parent zone
takes up to a day. With Cloudflare: **DNS → Settings → Enable DNSSEC**, then the
same DS submission at the registrar.

DNSSEC is a zone-wide change. If mail or any other service depends on this zone,
enable it during a window where a mistake can be rolled back.

## Step 4 — verify

```
npm run check:dns
```

Resolves each record over DNS-over-HTTPS through the same resolvers the scanner
uses (cloudflare-dns.com, falling back to dns.google) and reports the DNSSEC
authenticated-data flag.
