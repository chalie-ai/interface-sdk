/**
 * Gateway client — communicates with Chalie through the dashboard proxy.
 * All methods are safe to call even if scopes are denied.
 * @module
 */

import { ContextResult } from "./constants.ts";

/** Module-level gateway URL set by createDaemon() before any poll or handler runs. */
let _gateway = "";

/** @internal Called by createDaemon() before starting the server or polls. */
export function _setGateway(url: string): void {
  _gateway = url.replace(/\/$/, "");
}

/** @internal Used by daemon.ts to inject gateway URL into rendered HTML. */
export function _getGateway(): string {
  return _gateway;
}

/**
 * Push a signal to Chalie's world state.
 *
 * Signals are passive background knowledge — zero LLM cost. Use for periodic
 * updates the user doesn't need to act on immediately. The gateway enforces
 * your declared signal scopes; undeclared or denied types return false silently.
 *
 * @param signalType      Must match a key declared in SCOPES.signals.
 * @param content         Human-readable description of the signal.
 * @param activationEnergy Salience 0.0–1.0. Low (0.1–0.3) for routine updates.
 * @param metadata        Optional structured data attached to the signal.
 * @returns               true if accepted, false if denied or failed.
 */
export async function sendSignal(
  signalType: string,
  content: string,
  activationEnergy = 0.5,
  metadata: Record<string, unknown> | null = null,
): Promise<boolean> {
  try {
    const resp = await fetch(`${_gateway}/signals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signal_type: signalType,
        content,
        activation_energy: activationEnergy,
        metadata,
      }),
    });
    if (resp.status === 403) {
      console.log(`[signal] '${signalType}' denied by scope`);
      return false;
    }
    return resp.status === 202;
  } catch (e) {
    console.warn(`[signal] push failed: ${(e as Error).message}`);
    return false;
  }
}

/**
 * Push a message to Chalie's reasoning loop.
 *
 * Messages cost LLM tokens and may interrupt the user. Use only for
 * genuinely urgent or actionable information. Check attention state first:
 *
 * ```ts
 * const attention = (await getContext()).get(CONSTANTS.SCOPES.ATTENTION);
 * if (attention === CONSTANTS.ATTENTION.FOCUSED) {
 *   await sendSignal("my_type", content, 0.3); // downgrade
 *   return;
 * }
 * await sendMessage(urgentText, "my_topic");
 * ```
 *
 * @param text     Message content — Chalie reads this directly.
 * @param topic    Must match a key declared in SCOPES.messages.
 * @param metadata Optional structured context.
 * @returns        true if accepted, false if denied or failed.
 */
export async function sendMessage(
  text: string,
  topic: string | null = null,
  metadata: Record<string, unknown> | null = null,
): Promise<boolean> {
  try {
    const resp = await fetch(`${_gateway}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, topic, metadata }),
    });
    if (resp.status === 403) {
      console.log(`[message] topic '${topic}' denied by scope`);
      return false;
    }
    return resp.status === 202;
  } catch (e) {
    console.warn(`[message] push failed: ${(e as Error).message}`);
    return false;
  }
}

/**
 * Get the user's current context from the gateway.
 *
 * Returns a ContextResult accessor. Call `.get(CONSTANTS.SCOPES.*)` to read
 * each field — the return type is inferred from the scope key passed.
 * Fields the user denied are absent (`.get()` returns undefined).
 *
 * Safe to call frequently. Never throws — returns an empty context on error.
 *
 * ```ts
 * const ctx = await getContext();
 * const city = ctx.get(CONSTANTS.SCOPES.LOCATION)?.name ?? "your location";
 * ```
 */
export async function getContext(): Promise<ContextResult> {
  try {
    const resp = await fetch(`${_gateway}/context`);
    if (resp.ok) return new ContextResult(await resp.json());
  } catch (e) {
    console.warn(`[context] fetch failed: ${(e as Error).message}`);
  }
  return new ContextResult({});
}
