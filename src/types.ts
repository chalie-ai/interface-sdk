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

/** Return value from executeCommand(). Always return HTTP 200 — never throw. */
export interface CommandResult {
  text?: string | null;
  data?: unknown;
  error?: string | null;
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
   * Return an HTML fragment (single root <div>) shown when the user opens
   * your interface. Called server-side — fetch data here and bake it in.
   */
  renderInterface: () => Promise<string>;
}
