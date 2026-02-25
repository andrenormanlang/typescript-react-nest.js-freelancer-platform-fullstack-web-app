type ApiRoute = {
  method: string;
  path: string;
  summary: string;
  group: string;
};

type BuildOptions = {
  title?: string;
  subtitle?: string;
};

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

const METHOD_CLASS: Record<string, string> = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  PATCH: 'patch',
  DELETE: 'delete',
  OPTIONS: 'options',
  HEAD: 'head',
};

export function buildApiLandingHtml(document: any, options: BuildOptions = {}): string {
  const title = options.title ?? 'MindsMesh API';
  const subtitle = options.subtitle ?? 'Interactive API map';

  const routes = collectRoutes(document);
  const grouped = groupRoutes(routes);
  const groupsHtml = grouped
    .map((group, index) => renderGroup(group, index))
    .join('');

  const totalRoutes = routes.length;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

      :root {
        --bg: #0b1020;
        --bg-soft: #0f162c;
        --card: #151d38;
        --card-2: #111827;
        --text: #e6e9f0;
        --muted: #9aa3b2;
        --accent: #60a5fa;
        --accent-2: #34d399;
        --accent-3: #f59e0b;
        --accent-4: #f472b6;
        --border: rgba(148, 163, 184, 0.2);
        --shadow: 0 20px 50px rgba(15, 23, 42, 0.55);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: 'Space Grotesk', system-ui, sans-serif;
        color: var(--text);
        background: radial-gradient(circle at 15% 20%, rgba(96, 165, 250, 0.2), transparent 35%),
          radial-gradient(circle at 85% 15%, rgba(52, 211, 153, 0.18), transparent 30%),
          radial-gradient(circle at 80% 80%, rgba(244, 114, 182, 0.15), transparent 35%),
          var(--bg);
        background-attachment: fixed;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      .wrap {
        max-width: 980px;
        margin: 0 auto;
        padding: 56px 24px 80px;
      }

      header {
        display: grid;
        gap: 12px;
        margin-bottom: 36px;
      }

      .title {
        font-size: clamp(2.2rem, 4vw, 3.2rem);
        font-weight: 700;
        letter-spacing: -0.02em;
      }

      .subtitle {
        color: var(--muted);
        font-size: 1rem;
      }

      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        color: var(--muted);
        font-size: 0.95rem;
      }

      .pill {
        padding: 6px 12px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: rgba(15, 23, 42, 0.5);
      }

      .links {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .link {
        background: var(--card);
        border: 1px solid var(--border);
        padding: 8px 14px;
        border-radius: 10px;
        font-size: 0.9rem;
        transition: transform 0.2s ease, border-color 0.2s ease;
      }

      .link:hover {
        transform: translateY(-2px);
        border-color: rgba(96, 165, 250, 0.5);
      }

      details.group {
        border-radius: 18px;
        background: linear-gradient(145deg, rgba(21, 29, 56, 0.95), rgba(9, 14, 29, 0.95));
        border: 1px solid var(--border);
        box-shadow: var(--shadow);
        margin-bottom: 18px;
        overflow: hidden;
        animation: rise 0.6s ease forwards;
        opacity: 0;
      }

      details.group[open] summary::after {
        transform: rotate(180deg);
      }

      summary {
        list-style: none;
        cursor: pointer;
        padding: 18px 22px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        font-size: 1.05rem;
        background: rgba(15, 23, 42, 0.7);
      }

      summary::-webkit-details-marker {
        display: none;
      }

      summary::after {
        content: 'v';
        transition: transform 0.2s ease;
        color: var(--muted);
      }

      .group-title {
        display: flex;
        align-items: center;
        gap: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.9rem;
      }

      .group-count {
        color: var(--muted);
        font-size: 0.85rem;
      }

      .routes {
        display: grid;
        gap: 12px;
        padding: 18px 22px 24px;
      }

      .route {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 12px;
        padding: 12px 14px;
        border-radius: 14px;
        border: 1px solid rgba(148, 163, 184, 0.15);
        background: rgba(15, 23, 42, 0.55);
        font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
      }

      .route-info {
        display: grid;
        gap: 4px;
      }

      .path {
        font-size: 0.95rem;
      }

      .summary {
        color: var(--muted);
        font-size: 0.85rem;
        font-family: 'Space Grotesk', system-ui, sans-serif;
      }

      .method {
        align-self: start;
        padding: 6px 10px;
        border-radius: 10px;
        font-weight: 600;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        border: 1px solid transparent;
      }

      .method.get { background: rgba(96, 165, 250, 0.2); border-color: rgba(96, 165, 250, 0.6); color: #93c5fd; }
      .method.post { background: rgba(52, 211, 153, 0.2); border-color: rgba(52, 211, 153, 0.6); color: #6ee7b7; }
      .method.put { background: rgba(249, 115, 22, 0.2); border-color: rgba(249, 115, 22, 0.6); color: #fdba74; }
      .method.patch { background: rgba(236, 72, 153, 0.2); border-color: rgba(236, 72, 153, 0.6); color: #f9a8d4; }
      .method.delete { background: rgba(248, 113, 113, 0.2); border-color: rgba(248, 113, 113, 0.6); color: #fca5a5; }
      .method.options { background: rgba(148, 163, 184, 0.2); border-color: rgba(148, 163, 184, 0.6); color: #cbd5f5; }
      .method.head { background: rgba(148, 163, 184, 0.2); border-color: rgba(148, 163, 184, 0.6); color: #cbd5f5; }

      .empty {
        padding: 32px;
        text-align: center;
        color: var(--muted);
        border: 1px dashed var(--border);
        border-radius: 14px;
      }

      @keyframes rise {
        from { transform: translateY(10px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      @media (max-width: 720px) {
        .route {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <header>
        <div class="title">${escapeHtml(title)}</div>
        <div class="subtitle">${escapeHtml(subtitle)}</div>
        <div class="meta">
          <span class="pill">Base URL: <span id="base-url"></span></span>
          <span class="pill">${totalRoutes} routes</span>
        </div>
        <div class="links">
          <a class="link" href="/api-docs">Open Swagger UI</a>
        </div>
      </header>
      ${groupsHtml || '<div class="empty">No routes found in the OpenAPI document.</div>'}
    </div>
    <script>
      const baseUrl = window.location.origin;
      const el = document.getElementById('base-url');
      if (el) el.textContent = baseUrl;
      document.querySelectorAll('details.group').forEach((group, index) => {
        group.style.animationDelay = (index * 60) + 'ms';
      });
    </script>
  </body>
</html>`;
}

function collectRoutes(document: any): ApiRoute[] {
  const routes: ApiRoute[] = [];
  const seen = new Set<string>();
  const paths = document?.paths ?? {};

  for (const [path, pathItem] of Object.entries<any>(paths)) {
    if (!pathItem) continue;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      const upperMethod = method.toUpperCase();
      const key = `${upperMethod} ${path}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const summary =
        operation.summary ||
        operation.operationId ||
        (typeof operation.description === 'string' ? operation.description : '') ||
        'No description';

      routes.push({
        method: upperMethod,
        path,
        summary: truncate(summary, 120),
        group: resolveGroup(path, operation.tags),
      });
    }
  }

  return routes.sort((a, b) => {
    if (a.group !== b.group) return a.group.localeCompare(b.group);
    if (a.path !== b.path) return a.path.localeCompare(b.path);
    return a.method.localeCompare(b.method);
  });
}

function groupRoutes(routes: ApiRoute[]): Array<{ name: string; routes: ApiRoute[] }> {
  const grouped = new Map<string, ApiRoute[]>();

  for (const route of routes) {
    const key = route.group || 'General';
    const list = grouped.get(key) ?? [];
    list.push(route);
    grouped.set(key, list);
  }

  return Array.from(grouped.entries()).map(([name, list]) => ({
    name,
    routes: list,
  }));
}

function resolveGroup(path: string, tags?: string[]): string {
  if (Array.isArray(tags) && tags[0]) {
    return toTitleCase(tags[0]);
  }
  const segments = path.split('/').filter(Boolean);
  const first = segments[0] === 'api' ? segments[1] : segments[0];
  return toTitleCase(first ?? 'General');
}

function renderGroup(group: { name: string; routes: ApiRoute[] }, index: number): string {
  const routesHtml = group.routes.map(renderRoute).join('');
  const safeName = escapeHtml(group.name);

  return `
      <details class="group" open style="animation-delay:${index * 60}ms">
        <summary>
          <span class="group-title">${safeName}</span>
          <span class="group-count">${group.routes.length} routes</span>
        </summary>
        <div class="routes">
          ${routesHtml}
        </div>
      </details>
  `;
}

function renderRoute(route: ApiRoute): string {
  const methodClass = METHOD_CLASS[route.method] ?? 'get';
  const method = escapeHtml(route.method);
  const path = escapeHtml(route.path);
  const summary = escapeHtml(route.summary);

  return `
          <div class="route">
            <span class="method ${methodClass}">${method}</span>
            <div class="route-info">
              <div class="path">${path}</div>
              <div class="summary">${summary}</div>
            </div>
          </div>
  `;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function toTitleCase(value: string): string {
  if (!value) return value;
  return value
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
