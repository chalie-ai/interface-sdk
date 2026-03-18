/**
 * createDaemon() — wires up the HTTP server, poll scheduler, and gateway client.
 * @module
 */

import { _setGateway, _getGateway } from "./gateway.ts";
import type { DaemonConfig } from "./types.ts";

// ── Interval helpers ──────────────────────────────────────────────────────────

/** Convert seconds to milliseconds for use in Poll.every. */
export function seconds(n: number): number { return n * 1_000; }
/** Convert minutes to milliseconds for use in Poll.every. */
export function minutes(n: number): number { return n * 60_000; }
/** Convert hours to milliseconds for use in Poll.every. */
export function hours(n: number): number { return n * 3_600_000; }
/** Convert days to milliseconds for use in Poll.every. */
export function days(n: number): number { return n * 86_400_000; }

// ── CLI args ──────────────────────────────────────────────────────────────────

function parseArgs(): { gateway: string; port: number; dataDir: string } {
  const args: Record<string, string> = {};
  for (const arg of Deno.args) {
    const [key, value] = arg.replace(/^--/, "").split("=");
    if (key && value !== undefined) args[key] = value;
  }
  return {
    gateway: (args["gateway"] ?? "http://localhost:8081").replace(/\/$/, ""),
    port: parseInt(args["port"] ?? "4001", 10),
    dataDir: args["data-dir"] ?? "./data",
  };
}

// ── Poll scheduler ────────────────────────────────────────────────────────────

function startPolls(config: DaemonConfig): void {
  for (const poll of config.polls ?? []) {
    const run = async () => {
      try { await poll.run(); }
      catch (e) { console.warn(`[poll:${poll.name}] ${(e as Error).message}`); }
    };
    run();
    setInterval(run, poll.every);
    console.log(`[poll] '${poll.name}' every ${poll.every / 1000}s`);
  }
}

// ── Gateway registration ─────────────────────────────────────────────────────

async function registerWithGateway(
  gatewayBase: string,
  port: number,
  config: DaemonConfig,
): Promise<string> {
  const body = JSON.stringify({
    name: config.name,
    version: config.version,
    description: config.description,
    author: config.author ?? "",
    scopes: config.scopes,
    port,
  });

  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const resp = await fetch(`${gatewayBase}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (resp.ok) {
        const data = await resp.json() as { gateway_url: string; interface_id: string; status: string };
        console.log(`[register] ${data.status} → ${data.gateway_url}`);
        return data.gateway_url;
      }
      const err = await resp.text();
      console.warn(`[register] attempt ${attempt} failed: ${resp.status} ${err}`);
    } catch (e) {
      console.warn(`[register] attempt ${attempt}: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.error("[register] failed after 10 attempts — falling back to base gateway URL");
  return gatewayBase;
}

// ── HTTP server ───────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleRequest(req: Request, config: DaemonConfig): Promise<Response> {
  const path = new URL(req.url).pathname;

  if (path === "/health") {
    return json({ status: "ok", name: config.name, version: config.version });
  }

  if (path === "/capabilities") {
    return json(config.capabilities);
  }

  if (path === "/meta") {
    return json({
      name: config.name,
      version: config.version,
      description: config.description,
      author: config.author ?? "",
      scopes: config.scopes,
    });
  }

  if (path === "/execute" && req.method === "POST") {
    let body: { capability?: string; params?: Record<string, unknown> };
    try { body = await req.json(); }
    catch { return json({ text: null, data: null, error: "Invalid JSON body" }); }

    try {
      const result = await config.executeCommand(
        body.capability ?? "",
        body.params ?? {},
      );
      return json({ text: result.text ?? null, data: result.data ?? null, error: result.error ?? null });
    } catch (e) {
      return json({ text: null, data: null, error: `Unhandled error: ${(e as Error).message}` });
    }
  }

  if (path === "/" || path === "/index.html") {
    const fragment = await config.renderInterface();
    const html = _clientScript() + fragment;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  return new Response("Not found", { status: 404 });
}

// ── Client-side helper injection ──────────────────────────────────────────────

/**
 * Returns a <script> tag that defines `window.chalie` — a tiny client-side
 * helper that daemon UIs can use to call gateway routes without knowing
 * their own interface ID or gateway URL.
 *
 * The gateway's render proxy may override CHALIE_GW_BASE (it injects its
 * own <script> before this one). If already set, we use it. Otherwise we
 * extract the gateway path from the server-side gateway URL.
 */
function _clientScript(): string {
  // Extract the path portion of the gateway URL (e.g. "/gw/{id}")
  // so the browser can make relative requests to the same origin.
  const gw = _getGateway();
  let gwPath: string;
  try {
    gwPath = new URL(gw).pathname;
  } catch {
    gwPath = gw; // already a path
  }

  return `<script>
(function(){
  var base = window.CHALIE_GW_BASE || "${gwPath}";
  var _json = {"Content-Type":"application/json"};

  window.chalie = {
    gwBase: base,

    execute: function(capability, params) {
      return fetch(base + "/execute", {
        method: "POST",
        headers: _json,
        body: JSON.stringify({capability: capability, params: params || {}})
      }).then(function(r){ return r.json(); });
    },

    signal: function(type, content, energy, metadata) {
      return fetch(base + "/signals", {
        method: "POST",
        headers: _json,
        body: JSON.stringify({
          signal_type: type,
          content: typeof content === "string" ? content : JSON.stringify(content),
          activation_energy: energy || 0.5,
          metadata: metadata || null
        })
      }).then(function(r){ return r.status === 202; })
        .catch(function(){ return false; });
    },

    context: function() {
      return fetch(base + "/context")
        .then(function(r){ return r.json(); })
        .catch(function(){ return {}; });
    }
  };
})();
</script>
`;
}

// ── createDaemon ──────────────────────────────────────────────────────────────

/**
 * Start the interface daemon.
 *
 * Parses `--gateway`, `--port`, and `--data-dir` from process arguments,
 * initialises the gateway client, starts all declared polls, and serves
 * the Chalie interface contract over HTTP.
 *
 * Call this once at the bottom of your daemon file:
 *
 * ```ts
 * createDaemon({
 *   name: "Weather",
 *   version: "1.0.0",
 *   description: "Current conditions and forecasts",
 *   scopes: { context: { [CONSTANTS.SCOPES.LOCATION]: "Weather for your city" } },
 *   capabilities: [...],
 *   polls: [{ name: "hourly", every: hours(1), async run() { ... } }],
 *   async executeCommand(capability, params) { ... },
 *   async renderInterface() { return `<div>...</div>`; },
 * });
 * ```
 */
export async function createDaemon(config: DaemonConfig): Promise<void> {
  const { gateway, port, dataDir } = parseArgs();

  await Deno.mkdir(dataDir, { recursive: true });

  // Register with the dashboard gateway — returns the full gateway URL
  // (e.g. http://localhost:3000/gw/{interface_id})
  const gatewayUrl = await registerWithGateway(gateway, port, config);
  _setGateway(gatewayUrl);

  startPolls(config);

  console.log(`[${config.name}] v${config.version} on port ${port}`);
  Deno.serve({ port }, (req) => handleRequest(req, config));
}
