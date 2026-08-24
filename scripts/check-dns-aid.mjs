// Verifies the published DNS-AID records against dns/dns-aid.zone.
//
// Publishing happens at the DNS provider, not here, so this script is not part
// of `npm test`. Run it after a zone change:  npm run check:dns
//
// Exit codes: 0 when the published data matches the zone file, or when nothing
// is published yet (nothing is broken); 1 when a record exists but disagrees
// with what this repository says it should be.

import { DNS_AID } from './agent-config.mjs';

// The same resolvers the isitagentready scanner uses, in the same order.
const RESOLVERS = [
  { name: 'cloudflare', url: 'https://cloudflare-dns.com/dns-query' },
  { name: 'google', url: 'https://dns.google/resolve' }
];

const RR_TYPES = { SVCB: 64, HTTPS: 65, TXT: 16, DS: 43, DNSKEY: 48 };

let mismatches = 0;
let published = 0;
let pending = 0;

async function resolve(name, type) {
  let lastError;
  for (const resolver of RESOLVERS) {
    const query = `${resolver.url}?name=${encodeURIComponent(name)}&type=${RR_TYPES[type] ?? type}&do=true`;
    try {
      const response = await fetch(query, {
        headers: { accept: 'application/dns-json' },
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { ...(await response.json()), resolver: resolver.name };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`all resolvers failed for ${name} ${type}: ${lastError?.message}`);
}

// Presentation forms differ between resolvers and between generic and typed
// encodings, so compare on a normalised token set rather than on the string.
function normalise(rdata) {
  return rdata
    .replace(/\s+/g, ' ')
    .replace(/"/g, '')
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ');
}

function report(status, label, detail) {
  const mark = { ok: 'PASS', pending: '····', bad: 'FAIL' }[status];
  console.log(`${mark}  ${label}`);
  if (detail) console.log(`      ${detail}`);
}

console.log(`DNS-AID verification for ${DNS_AID.zone}\n`);

for (const entry of DNS_AID.entrypoints) {
  const owner = entry.owner.replace(/\.$/, '');
  const expected = normalise(
    `${entry.priority} ${entry.target} alpn="${entry.alpn}" port=${entry.port} mandatory=${entry.mandatory} ` +
    entry.params.map((param) => `${param.key}="${param.value}"`).join(' ')
  );

  let found = null;
  for (const type of ['SVCB', 'HTTPS']) {
    const answer = await resolve(owner, type);
    const records = (answer.Answer ?? []).filter((record) => record.type === RR_TYPES[type]);
    if (records.length) {
      found = { type, records, ad: answer.AD, resolver: answer.resolver };
      break;
    }
  }

  if (!found) {
    pending += 1;
    report('pending', `${owner} SVCB/HTTPS`, 'not published yet — see dns/README.md');
    continue;
  }

  published += 1;
  const matched = found.records.some((record) => normalise(record.data) === expected);
  if (matched) {
    report('ok', `${owner} ${found.type}`, `matches dns/dns-aid.zone (via ${found.resolver}, AD=${found.ad})`);
  } else {
    mismatches += 1;
    report('bad', `${owner} ${found.type}`, `published: ${found.records.map((record) => record.data).join(' | ')}`);
    console.log(`      expected: ${expected}`);
  }
  if (!found.ad) {
    console.log('      note: resolver did not set the DNSSEC authenticated-data flag');
  }
}

for (const record of DNS_AID.textRecords) {
  const owner = record.owner.replace(/\.$/, '');
  const answer = await resolve(owner, 'TXT');
  const values = (answer.Answer ?? []).filter((entry) => entry.type === RR_TYPES.TXT).map((entry) => entry.data.replace(/^"|"$/g, ''));
  if (!values.length) {
    pending += 1;
    report('pending', `${owner} TXT`, 'not published yet — see dns/README.md');
  } else if (values.includes(record.value)) {
    published += 1;
    report('ok', `${owner} TXT`, `matches dns/dns-aid.zone (via ${answer.resolver}, AD=${answer.AD})`);
  } else {
    published += 1;
    mismatches += 1;
    report('bad', `${owner} TXT`, `published: ${values.join(' | ')}`);
    console.log(`      expected: ${record.value}`);
  }
}

const ds = await resolve(DNS_AID.zone, 'DS');
const signed = (ds.Answer ?? []).some((record) => record.type === RR_TYPES.DS);
report(signed ? 'ok' : 'pending', `${DNS_AID.zone} DNSSEC`,
  signed
    ? `DS present at the parent (${(ds.Answer ?? []).length} record(s))`
    : 'zone is unsigned — no DS record at the .pt parent. See step 3 of dns/README.md');

console.log(`\n${published} record(s) published, ${pending} pending, ${mismatches} mismatched.`);
if (mismatches) {
  console.error('\nPublished DNS disagrees with dns/dns-aid.zone.');
  process.exit(1);
}
if (pending) console.log('Nothing is broken; the pending records simply have not been created yet.');
