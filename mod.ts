/**
 * Chalie Interface SDK
 *
 * Build interfaces that extend Chalie's capabilities. Import everything from
 * this single entry point:
 *
 * ```ts
 * import { createDaemon, sendSignal, sendMessage, getContext, CONSTANTS, hours } from "jsr:@chalie/interface-sdk";
 * ```
 *
 * @module
 */

export { createDaemon, seconds, minutes, hours, days } from "./src/daemon.ts";
export { sendSignal, sendMessage, getContext } from "./src/gateway.ts";
export { CONSTANTS, ContextResult } from "./src/constants.ts";
export type {
  LocationContext,
  TimezoneContext,
  DeviceContext,
  AttentionState,
  ScopeReturnType,
} from "./src/constants.ts";
export type {
  Capability,
  Parameter,
  Scopes,
  CommandResult,
  Poll,
  DaemonConfig,
} from "./src/types.ts";
