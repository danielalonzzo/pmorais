// Probes the deployed MCP server at MCP_SERVER.endpoint.
//
// Network-dependent, so it is not part of `npm test`. Run it after a deploy:
//   npm run check:mcp            (production)
//   MCP_BASE=http://127.0.0.1:8793/mcp npm run check:mcp   (a local run)
//
// The first thing it checks is that PHP actually executed. On a host where the
// handler is missing, Apache either denies the file or hands back its source —
// both are reported explicitly rather than surfacing as a confusing parse error.

import { MCP_SERVER } from './agent-config.mjs';

const endpoint = process.env.MCP_BASE ?? MCP_SERVER.endpoint;
const failures = [];
const fail = (message) => { failures.push(message); console.log(`FAIL  ${message}`); };
const pass = (message, detail) => console.log(`PASS  ${message}${detail ? `\n      ${detail}` : ''}`);

let nextId = 1;
async function rpc(method, params) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, ...(params ? { params } : {}) }),
    signal: AbortSignal.timeout(20000)
  });
  const text = await response.text();
  if (text.includes('<?php')) throw new Error('the origin returned PHP source — the PHP handler is not enabled for this host');
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`HTTP ${response.status}: response is not JSON (${text.slice(0, 120).replace(/\s+/g, ' ')})`);
  }
  if (body.error) throw new Error(`${method} -> JSON-RPC ${body.error.code}: ${body.error.message}`);
  return body.result;
}

console.log(`MCP verification for ${endpoint}\n`);

// 1. The endpoint exists and PHP runs.
try {
  const probe = await fetch(endpoint, { method: 'GET', signal: AbortSignal.timeout(20000) });
  const text = await probe.text();
  if (probe.status === 404) fail('GET returned 404 — the /mcp rewrite is not in the deployed .htaccess');
  else if (probe.status === 403) fail('GET returned 403 — mcp/.htaccess denied the file, so no PHP handler is loaded');
  else if (text.includes('<?php')) fail('GET returned PHP source — PHP is not executing on this host');
  else if (probe.status !== 405) fail(`GET returned ${probe.status}; streamable HTTP requires 405 when no SSE stream is offered`);
  else pass('GET returns 405 with an Allow header', `Allow: ${probe.headers.get('allow')}`);
} catch (error) {
  fail(`GET probe failed: ${error.message}`);
}

// 2. Both handshakes.
try {
  const result = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'check-mcp', version: '1.0.0' } });
  if (result.protocolVersion !== '2025-06-18') fail(`initialize did not honour a supported version, got ${result.protocolVersion}`);
  else if (result.serverInfo?.name !== MCP_SERVER.name) fail(`serverInfo.name is ${result.serverInfo?.name}, expected ${MCP_SERVER.name}`);
  else if (result.serverInfo?.version !== MCP_SERVER.version) fail(`serverInfo.version is ${result.serverInfo?.version}, expected ${MCP_SERVER.version}`);
  else pass('initialize negotiates and identifies the server', `${result.serverInfo.name} ${result.serverInfo.version}`);
} catch (error) {
  fail(error.message);
}

try {
  const result = await rpc('server/discover', {});
  const missing = ['cacheScope', 'capabilities', 'resultType', 'supportedVersions', 'ttlMs'].filter((key) => !(key in result));
  if (missing.length) fail(`server/discover is missing required 2026-07-28 fields: ${missing.join(', ')}`);
  else pass('server/discover returns the 2026-07-28 shape', `supportedVersions: ${result.supportedVersions.join(', ')}`);
} catch (error) {
  fail(error.message);
}

// 3. Tools match what the server card advertises.
try {
  const result = await rpc('tools/list');
  const names = (result.tools ?? []).map((tool) => tool.name).sort();
  const expected = [...MCP_SERVER.tools].sort();
  if (names.join() !== expected.join()) fail(`tools/list returned ${names.join(', ')}; the server card advertises ${expected.join(', ')}`);
  else pass(`tools/list matches the server card`, names.join(', '));
  for (const key of ['resultType', 'cacheScope', 'ttlMs']) {
    if (!(key in result)) fail(`tools/list is missing ${key}, required from 2026-07-28`);
  }
} catch (error) {
  fail(error.message);
}

// 4. One real call, and one that must be refused.
try {
  const result = await rpc('tools/call', { name: 'list_services', arguments: {} });
  const text = result.content?.[0]?.text ?? '';
  if (result.isError) fail(`list_services returned an error: ${text}`);
  else if (!text.includes('osteopathy') && !text.includes('Osteopatia')) fail('list_services did not mention osteopathy');
  else pass('tools/call list_services returns the published services', `${text.length} chars`);
} catch (error) {
  fail(error.message);
}

try {
  const result = await rpc('tools/call', { name: 'read_page', arguments: { path: '/perfil' } });
  if (!result.isError) fail('read_page served a private route — the allow-list is not being enforced');
  else pass('read_page refuses a private route');
} catch (error) {
  fail(error.message);
}

console.log(`\n${failures.length ? `${failures.length} check(s) failed.` : 'All MCP checks passed.'}`);
process.exit(failures.length ? 1 : 0);
