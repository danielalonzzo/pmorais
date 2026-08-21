import fs from 'node:fs';
import path from 'node:path';

// Every module that lives in js/ or en/js/ is cache-busted together. Deriving the
// set from disk keeps new files covered without editing this module, and keeps the
// specifier identical in HTML and in ESM imports — a mismatch would load
// firebase-config.js twice and create a second Firestore instance.
export function localModules(root) {
  return new Set(
    [path.join(root, 'js'), path.join(root, 'en/js')]
      .flatMap((directory) => fs.readdirSync(directory))
      .filter((name) => name.endsWith('.js'))
  );
}

// Matches src="...", from "..." and import("...") in HTML and JavaScript alike.
const SCRIPT_SPECIFIER = /(src=|from\s+|import\()(["'])([^"']+?\.js)(\?[^"']*)?(["'])/g;

// Absolute URLs are third-party (gstatic, unpkg) and carry their version in the
// path. Without this guard gstatic's firebase-auth.js would match our auth.js.
function isThirdParty(specifier) {
  return /^[a-z]+:\/\//i.test(specifier) || specifier.startsWith('//');
}

export function eachLocalModuleSpecifier(source, modules, visit) {
  for (const match of source.matchAll(SCRIPT_SPECIFIER)) {
    const [, , , specifier, query = ''] = match;
    if (isThirdParty(specifier) || !modules.has(specifier.split('/').pop())) continue;
    visit(specifier, query);
  }
}

export function versionLocalModules(source, modules, assetVersion) {
  return source.replace(SCRIPT_SPECIFIER, (match, prefix, openQuote, specifier, _query, closeQuote) => {
    if (isThirdParty(specifier) || !modules.has(specifier.split('/').pop())) return match;
    return `${prefix}${openQuote}${specifier}?v=${assetVersion}${closeQuote}`;
  });
}
