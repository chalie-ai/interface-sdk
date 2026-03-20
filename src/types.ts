/**
 * Core types for the Chalie Interface SDK.
 * @module
 */

/** A single parameter accepted by a capability. */
export interface Parameter {
  name: string;
  type: "string" | "number" | "integer" | "boolean" | "object";
  required: boolean;
  description: string;
  default?: unknown;
}

/** A tool capability exposed to Chalie's reasoning loop. */
export interface Capability {
  name: string;
  description: string;
  documentation?: string;
  parameters: Parameter[];
  returns?: { type: string; description: string };
}

/** Scope declarations shown to the user during installation. */
export interface Scopes {
  context?: Record<string, string>;
  signals?: Record<string, string>;
  messages?: Record<string, string>;
}

/**
 * A typed UI block. Daemons build these via the `blocks` module.
 * The frontend renders them natively — no HTML, CSS, or JS from daemons.
 */
export interface Block {
  type: string;
  [key: string]: unknown;
}

/** Return value from executeCommand(). Always return HTTP 200 — never throw. */
export interface CommandResult {
  text?: string | null;
  data?: unknown;
  error?: string | null;
  /** Block array — if present, the frontend renders these in the overlay. */
  blocks?: Block[];
  /** URL to open in a new browser tab (e.g. OAuth flow). */
  openUrl?: string;
  /** @deprecated Use blocks instead. Raw HTML output. */
  html?: string | null;
}

/** A scheduled background job. */
export interface Poll {
  /** Human-readable name used in log output. */
  name: string;
  /** Interval in milliseconds. Use seconds(), minutes(), hours(), days(). */
  every: number;
  /** Called on each tick. Errors are logged and the poll continues. */
  run: () => Promise<void>;
}

/** Configuration passed to createDaemon(). */
export interface DaemonConfig {
  /** Display name shown in the launcher and settings. */
  name: string;
  /** Semantic version string (major.minor.patch). */
  version: string;
  /** One-line description shown in the interface catalogue. */
  description: string;
  /** Author name or organisation. */
  author?: string;
  /** Scope declarations — approved by the user at install time. */
  scopes: Scopes;
  /** Tool capabilities exposed to Chalie's ACT loop. */
  capabilities: Capability[];
  /** Background jobs that run on a schedule. */
  polls?: Poll[];
  /**
   * Handle a capability invocation from Chalie's reasoning loop.
   * Always return a CommandResult — never throw.
   */
  executeCommand: (
    capability: string,
    params: Record<string, unknown>,
  ) => Promise<CommandResult>;
  /**
   * Return the UI shown when the user opens your interface.
   *
   * **Preferred (v1.2+):** Return `Block[]` — the frontend renders blocks
   * natively using the Radiant design system. Build blocks with the SDK's
   * block builder functions:
   *
   * ```ts
   * import { section, header, text, actions, button } from "jsr:@chalie/interface-sdk/blocks";
   *
   * renderInterface() {
   *   return [
   *     section([
   *       header("My Interface", 2),
   *       text("Status: connected", "plain"),
   *       actions(button("Refresh", { execute: "refresh" })),
   *     ]),
   *   ];
   * }
   * ```
   *
   * **Legacy:** Return an HTML string. The SDK injects a `chalie` client-side
   * helper before your HTML. This path is deprecated — migrate to blocks.
   */
  renderInterface: () => Promise<string> | Promise<Block[]> | string | Block[];
}
