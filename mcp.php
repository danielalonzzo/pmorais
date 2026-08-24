<?php
/**
 * Read-only MCP server for pmorais.pt
 * Developed by Elysium λ Development & Research
 *
 * Streamable HTTP transport, stateless, anonymous. Every tool and resource is
 * backed by a static file already published on this origin — api/v1/*.json and
 * the markdown renditions in agents/md/. Nothing here writes, authenticates, or
 * touches the client area.
 *
 * Two handshakes are supported. `initialize` is what deployed clients speak
 * (2025-03-26 through 2025-11-25). `server/discover` replaced it in 2026-07-28,
 * which also made resultType/cacheScope/ttlMs mandatory on list and read
 * results — those fields are emitted unconditionally, since older clients
 * ignore unknown members.
 *
 * The server card is generated separately, at /.well-known/mcp/server-card.json.
 *
 * This lives at the document root rather than in mcp/index.php on purpose. A
 * directory named "mcp" makes mod_dir answer POST /mcp with a 301 to /mcp/,
 * which drops the JSON-RPC body — it beats the rewrite regardless of rule
 * order. A plain file has no DirectorySlash behaviour to fight.
 */

declare(strict_types=1);

const SITE_ORIGIN       = 'https://pmorais.pt';
const SERVER_NAME       = 'pmorais-public-content';
const SERVER_VERSION    = '1.0.0';
const LATEST_PROTOCOL   = '2026-07-28';
const CACHE_TTL_MS      = 300000;

const SUPPORTED_PROTOCOLS = ['2026-07-28', '2025-11-25', '2025-06-18', '2025-03-26'];

const INSTRUCTIONS = <<<TXT
Public content for Paulo Morais — personal training, online training, adapted
exercise in oncology and osteopathy in Lisbon, Portugal. Everything served here
is already public on https://pmorais.pt.

Hard limits, which the site itself observes:
- No price, session length, schedule or availability is published anywhere. Do
  not infer or estimate any.
- Health content is informational. It is not a diagnosis, a prescription or
  emergency advice. Route urgent or diagnostic questions to a licensed
  healthcare or emergency service.
- Adapted exercise in oncology accompanies oncology care; it never replaces it.
- Testimonials on the site are individual experiences, not average outcomes.
- There is no booking API. To arrange a session, give the person the contact
  channels from get_contact_details and let them make contact themselves.
TXT;

$root = __DIR__;

// ---------------------------------------------------------------- helpers --

function send(int $status, ?array $body, array $headers = []): never
{
    http_response_code($status);
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, MCP-Protocol-Version, Accept, Last-Event-ID');
    header('Access-Control-Expose-Headers: MCP-Protocol-Version');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header('X-Robots-Tag: noindex, nofollow');
    foreach ($headers as $header) {
        header($header);
    }
    if ($body !== null) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), "\n";
    }
    exit;
}

function rpcError(int $code, string $message, mixed $id = null, ?array $data = null): never
{
    $error = ['code' => $code, 'message' => $message];
    if ($data !== null) {
        $error['data'] = $data;
    }
    // A malformed request has no meaningful id; JSON-RPC says to use null.
    send(200, ['jsonrpc' => '2.0', 'id' => $id, 'error' => $error]);
}

function rpcResult(mixed $id, array $result): never
{
    send(200, ['jsonrpc' => '2.0', 'id' => $id, 'result' => $result]);
}

/** Fields required by 2026-07-28 on every cacheable result. */
function cacheable(array $result): array
{
    return $result + ['resultType' => 'complete', 'cacheScope' => 'public', 'ttlMs' => CACHE_TTL_MS];
}

function readJsonFile(string $path): ?array
{
    if (!is_file($path)) {
        return null;
    }
    $decoded = json_decode((string) file_get_contents($path), true);
    return is_array($decoded) ? $decoded : null;
}

function textResult(string $text, mixed $structured = null): array
{
    $result = ['content' => [['type' => 'text', 'text' => $text]], 'resultType' => 'complete'];
    if ($structured !== null) {
        $result['structuredContent'] = $structured;
    }
    return $result;
}

function toolError(string $message): array
{
    return ['content' => [['type' => 'text', 'text' => $message]], 'isError' => true, 'resultType' => 'complete'];
}

function localise(mixed $value, string $language): mixed
{
    if (!is_array($value)) {
        return $value;
    }
    return $value[$language] ?? $value['pt-PT'] ?? $value['en-GB'] ?? $value;
}

// --------------------------------------------------------------- catalogue --

/** The canonical pages, read from the generated api/v1/pages.json. */
function pageIndex(string $root): array
{
    $pages = readJsonFile("$root/api/v1/pages.json")['pages'] ?? [];
    $byPath = [];
    foreach ($pages as $page) {
        $byPath[$page['path']] = $page;
    }
    return $byPath;
}

/**
 * Maps a canonical path to its markdown file. Never concatenates caller input
 * into a filesystem path — the path must be a key of the generated page index,
 * and the filename is derived from that entry, not from the request.
 */
function markdownFileFor(string $root, array $page): ?string
{
    $trimmed = ltrim($page['path'], '/');
    $relative = ($trimmed === '' || str_ends_with($trimmed, '/')) ? "{$trimmed}index.md" : "$trimmed.md";
    $file = "$root/agents/md/$relative";
    $real = realpath($file);
    $base = realpath("$root/agents/md");
    if ($real === false || $base === false || !str_starts_with($real, $base . DIRECTORY_SEPARATOR)) {
        return null;
    }
    return $real;
}

function toolDefinitions(): array
{
    return [
        [
            'name' => 'list_services',
            'title' => 'List published services',
            'description' => 'The services published on pmorais.pt — in-person personal training, online training, adapted exercise in oncology, and osteopathy — with delivery modes and the limits the site places on each. No pricing is published and none is returned.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'language' => ['type' => 'string', 'enum' => ['pt-PT', 'en-GB'], 'description' => 'Language for names and summaries. Defaults to pt-PT, the site default.'],
                ],
                'additionalProperties' => false,
            ],
            'annotations' => ['readOnlyHint' => true, 'openWorldHint' => false],
        ],
        [
            'name' => 'get_contact_details',
            'title' => 'Get public contact channels',
            'description' => 'Email, telephone, WhatsApp, Instagram and the URLs of the published contact forms. There is no booking API; a person arranges sessions directly.',
            'inputSchema' => ['type' => 'object', 'properties' => new stdClass(), 'additionalProperties' => false],
            'annotations' => ['readOnlyHint' => true, 'openWorldHint' => false],
        ],
        [
            'name' => 'list_pages',
            'title' => 'List canonical pages',
            'description' => 'The canonical public pages with language, reciprocal alternate, title, description and estimated token count of the markdown rendition.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'language' => ['type' => 'string', 'enum' => ['pt-PT', 'en-GB'], 'description' => 'Return only pages in this language. Omit for all.'],
                ],
                'additionalProperties' => false,
            ],
            'annotations' => ['readOnlyHint' => true, 'openWorldHint' => false],
        ],
        [
            'name' => 'read_page',
            'title' => 'Read a page as markdown',
            'description' => 'Return the full markdown rendition of one canonical page. Use list_pages first to get valid paths.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'path' => ['type' => 'string', 'description' => 'Canonical path from list_pages, for example "/osteopatia" or "/en/". A full https://pmorais.pt/... URL is also accepted.'],
                ],
                'required' => ['path'],
                'additionalProperties' => false,
            ],
            'annotations' => ['readOnlyHint' => true, 'openWorldHint' => false],
        ],
        [
            'name' => 'search_site',
            'title' => 'Search the published content',
            'description' => 'Case-insensitive search across every markdown rendition and the expanded factual representation. Returns matching passages with the page they came from.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'query' => ['type' => 'string', 'description' => 'Text to search for.', 'minLength' => 2],
                    'limit' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 25, 'description' => 'Maximum passages to return. Defaults to 8.'],
                ],
                'required' => ['query'],
                'additionalProperties' => false,
            ],
            'annotations' => ['readOnlyHint' => true, 'openWorldHint' => false],
        ],
    ];
}

function callTool(string $root, string $name, array $arguments): array
{
    $language = $arguments['language'] ?? 'pt-PT';
    if (!in_array($language, ['pt-PT', 'en-GB'], true)) {
        return toolError('language must be "pt-PT" or "en-GB".');
    }

    switch ($name) {
        case 'list_services':
            $data = readJsonFile("$root/api/v1/services.json");
            if ($data === null) {
                return toolError('The services document is unavailable.');
            }
            $lines = [];
            foreach ($data['services'] as $service) {
                $line = sprintf(
                    "- %s (%s)\n  %s\n  Delivery: %s — %s\n  Page: %s",
                    localise($service['name'], $language),
                    $service['id'],
                    localise($service['summary'], $language),
                    implode(', ', $service['delivery']),
                    $service['area'],
                    localise($service['page'], $language)
                );
                if (!empty($service['constraints'])) {
                    $line .= "\n  Limits: " . implode(' ', $service['constraints']);
                }
                $lines[] = $line;
            }
            $text = implode("\n\n", $lines) . "\n\nPricing: not published. " . $data['pricingNote'];
            return textResult($text, ['services' => $data['services'], 'pricing' => null]);

        case 'get_contact_details':
            $data = readJsonFile("$root/api/v1/contact.json");
            if ($data === null) {
                return toolError('The contact document is unavailable.');
            }
            $text = implode("\n", [
                'Email: ' . $data['email'],
                'Telephone / WhatsApp: ' . $data['telephone'],
                'Instagram: ' . $data['instagram'],
                'Location: ' . $data['locality'],
                'Contact forms: ' . implode(', ', (array) localise($data['contactForms'], $language)),
                'Client area (human sign-in only): ' . localise($data['clientArea'], $language),
                '',
                $data['note'],
            ]);
            return textResult($text, $data);

        case 'list_pages':
            $pages = array_values(pageIndex($root));
            if (isset($arguments['language'])) {
                $pages = array_values(array_filter($pages, static fn (array $page): bool => $page['language'] === $arguments['language']));
            }
            $lines = array_map(
                static fn (array $page): string => sprintf(
                    "- %s (%s)\n  %s\n  %s\n  markdown: %s (~%d tokens)",
                    $page['path'],
                    $page['language'],
                    $page['title'],
                    $page['description'],
                    $page['markdown'],
                    $page['markdownTokens']
                ),
                $pages
            );
            return textResult(implode("\n\n", $lines), ['pages' => $pages]);

        case 'read_page':
            $requested = trim((string) ($arguments['path'] ?? ''));
            if ($requested === '') {
                return toolError('path is required. Call list_pages for the valid paths.');
            }
            if (str_starts_with($requested, SITE_ORIGIN)) {
                $requested = substr($requested, strlen(SITE_ORIGIN));
            }
            if ($requested === '' || $requested[0] !== '/') {
                $requested = '/' . $requested;
            }
            $index = pageIndex($root);
            // Tolerate a trailing slash on a non-root path.
            if (!isset($index[$requested]) && rtrim($requested, '/') !== '' && isset($index[rtrim($requested, '/')])) {
                $requested = rtrim($requested, '/');
            }
            if (!isset($index[$requested])) {
                return toolError(sprintf(
                    '"%s" is not a canonical page. Valid paths: %s',
                    $requested,
                    implode(', ', array_keys($index))
                ));
            }
            $file = markdownFileFor($root, $index[$requested]);
            if ($file === null) {
                return toolError('The markdown rendition for that page is unavailable.');
            }
            return textResult((string) file_get_contents($file), [
                'path' => $requested,
                'canonical' => $index[$requested]['canonical'],
                'language' => $index[$requested]['language'],
            ]);

        case 'search_site':
            $query = trim((string) ($arguments['query'] ?? ''));
            if (mb_strlen($query) < 2) {
                return toolError('query must be at least 2 characters.');
            }
            $limit = (int) ($arguments['limit'] ?? 8);
            $limit = max(1, min(25, $limit));

            $haystacks = [];
            foreach (pageIndex($root) as $path => $page) {
                $file = markdownFileFor($root, $page);
                if ($file !== null) {
                    $haystacks[$path] = (string) file_get_contents($file);
                }
            }
            if (is_file("$root/llms-full.txt")) {
                $haystacks['/llms-full.txt'] = (string) file_get_contents("$root/llms-full.txt");
            }

            $matches = [];
            foreach ($haystacks as $source => $content) {
                foreach (preg_split('/\n{2,}/', $content) ?: [] as $passage) {
                    $passage = trim($passage);
                    // Skip front matter and passages that are only an image or
                    // a bare link — the alt text matches often, and the passage
                    // reads as noise to whoever asked the question.
                    if ($passage === '' || str_starts_with($passage, '---') || preg_match('/^!?\[[^\]]*\]\([^)]*\)$/', $passage)) {
                        continue;
                    }
                    if (mb_stripos($passage, $query) !== false) {
                        $matches[] = ['source' => $source, 'passage' => $passage];
                        if (count($matches) >= $limit) {
                            break 2;
                        }
                    }
                }
            }
            if (!$matches) {
                return textResult(sprintf('Nothing in the published content matches "%s".', $query), ['matches' => []]);
            }
            $text = implode("\n\n", array_map(
                static fn (array $match): string => "[{$match['source']}]\n{$match['passage']}",
                $matches
            ));
            return textResult($text, ['matches' => $matches, 'query' => $query]);
    }

    return toolError(sprintf('Unknown tool "%s".', $name));
}

function resourceDefinitions(string $root): array
{
    $resources = [
        [
            'uri' => SITE_ORIGIN . '/llms.txt',
            'name' => 'llms.txt',
            'title' => 'Site index for language models',
            'mimeType' => 'text/plain',
            'description' => 'Short index of the public site.',
            'file' => "$root/llms.txt",
        ],
        [
            'uri' => SITE_ORIGIN . '/llms-full.txt',
            'name' => 'llms-full.txt',
            'title' => 'Expanded factual representation',
            'mimeType' => 'text/plain',
            'description' => 'Long-form description of the organisation, services and interpretation limits.',
            'file' => "$root/llms-full.txt",
        ],
    ];
    foreach (pageIndex($root) as $path => $page) {
        $file = markdownFileFor($root, $page);
        if ($file === null) {
            continue;
        }
        $resources[] = [
            'uri' => $page['markdown'],
            'name' => ltrim($path, '/') ?: 'index',
            'title' => $page['title'],
            'mimeType' => 'text/markdown',
            'description' => $page['description'],
            'file' => $file,
        ];
    }
    return $resources;
}

// ------------------------------------------------------------- transport ---

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    send(204, null);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    // Streamable HTTP: a server that does not offer an SSE stream on GET must
    // answer 405. The body is a courtesy for anyone who opens the URL by hand.
    send(405, [
        'error' => 'This MCP endpoint accepts POST with a JSON-RPC 2.0 body.',
        'serverCard' => SITE_ORIGIN . '/.well-known/mcp/server-card.json',
        'documentation' => SITE_ORIGIN . '/llms-full.txt',
        'protocolVersions' => SUPPORTED_PROTOCOLS,
    ], ['Allow: POST, OPTIONS']);
}

$raw = file_get_contents('php://input');
if ($raw === false || $raw === '') {
    rpcError(-32600, 'Empty request body.');
}
if (strlen($raw) > 262144) {
    rpcError(-32600, 'Request body too large.');
}

$request = json_decode($raw, true);
if (!is_array($request)) {
    rpcError(-32700, 'Parse error: body is not valid JSON.');
}
if (array_is_list($request)) {
    // Batching was removed from the protocol in 2025-06-18.
    rpcError(-32600, 'Batch requests are not supported.');
}

$id     = $request['id'] ?? null;
$method = $request['method'] ?? null;
$params = is_array($request['params'] ?? null) ? $request['params'] : [];

if (!is_string($method)) {
    rpcError(-32600, 'Invalid request: "method" must be a string.', $id);
}

// Notifications carry no id and get no response body.
if ($id === null && str_starts_with($method, 'notifications/')) {
    send(202, null);
}

switch ($method) {
    case 'initialize':
        $requested = is_string($params['protocolVersion'] ?? null) ? $params['protocolVersion'] : LATEST_PROTOCOL;
        $negotiated = in_array($requested, SUPPORTED_PROTOCOLS, true) ? $requested : LATEST_PROTOCOL;
        header('MCP-Protocol-Version: ' . $negotiated);
        rpcResult($id, [
            'protocolVersion' => $negotiated,
            'capabilities' => [
                'tools' => ['listChanged' => false],
                'resources' => ['listChanged' => false, 'subscribe' => false],
                'prompts' => ['listChanged' => false],
            ],
            'serverInfo' => [
                'name' => SERVER_NAME,
                'title' => 'Paulo Morais public content',
                'version' => SERVER_VERSION,
                'websiteUrl' => SITE_ORIGIN,
            ],
            'instructions' => INSTRUCTIONS,
        ]);

    case 'server/discover':
        header('MCP-Protocol-Version: ' . LATEST_PROTOCOL);
        rpcResult($id, cacheable([
            'supportedVersions' => SUPPORTED_PROTOCOLS,
            'capabilities' => [
                'tools' => ['listChanged' => false],
                'resources' => ['listChanged' => false, 'subscribe' => false],
                'prompts' => ['listChanged' => false],
            ],
            'instructions' => INSTRUCTIONS,
        ]));

    case 'ping':
        rpcResult($id, []);

    case 'tools/list':
        rpcResult($id, cacheable(['tools' => toolDefinitions()]));

    case 'tools/call':
        $name = $params['name'] ?? null;
        if (!is_string($name)) {
            rpcError(-32602, 'Invalid params: "name" must be a string.', $id);
        }
        $arguments = is_array($params['arguments'] ?? null) ? $params['arguments'] : [];
        $known = array_column(toolDefinitions(), 'name');
        if (!in_array($name, $known, true)) {
            rpcError(-32602, sprintf('Unknown tool "%s".', $name), $id, ['availableTools' => $known]);
        }
        rpcResult($id, callTool($root, $name, $arguments));

    case 'resources/list':
        $resources = array_map(
            static fn (array $resource): array => array_diff_key($resource, ['file' => null]),
            resourceDefinitions($root)
        );
        rpcResult($id, cacheable(['resources' => array_values($resources)]));

    case 'resources/read':
        $uri = $params['uri'] ?? null;
        if (!is_string($uri)) {
            rpcError(-32602, 'Invalid params: "uri" must be a string.', $id);
        }
        foreach (resourceDefinitions($root) as $resource) {
            if ($resource['uri'] === $uri) {
                rpcResult($id, cacheable(['contents' => [[
                    'uri' => $resource['uri'],
                    'mimeType' => $resource['mimeType'],
                    'text' => (string) file_get_contents($resource['file']),
                ]]]));
            }
        }
        rpcError(-32602, sprintf('Unknown resource "%s".', $uri), $id);

    case 'prompts/list':
        rpcResult($id, cacheable(['prompts' => []]));

    case 'resources/templates/list':
        rpcResult($id, cacheable(['resourceTemplates' => []]));
}

rpcError(-32601, sprintf('Method "%s" is not implemented by this server.', $method), $id);
