/**
 * Typed constants for every scope, context field, and discrete value the
 * Chalie gateway can return.
 *
 * Import and use `CONSTANTS` everywhere instead of magic strings:
 *
 * ```ts
 * import { CONSTANTS } from "jsr:@chalie/interface-sdk";
 *
 * const SCOPES = {
 *   context: {
 *     [CONSTANTS.SCOPES.LOCATION]: "Required for weather at your current city",
 *   },
 * };
 *
 * const ctx = await getContext();
 * const location = ctx.get(CONSTANTS.SCOPES.LOCATION);
 * // ^ LocationContext | undefined  →  .lat .lon .name autocompleted
 *
 * if (ctx.get(CONSTANTS.SCOPES.ATTENTION) === CONSTANTS.ATTENTION.FOCUSED) { ... }
 * ```
 *
 * @module
 */

// ── Context field interfaces ──────────────────────────────────────────────────

/** City-level location. Coordinates snapped to ~1 km geohash — never raw GPS. */
export interface LocationContext {
  lat: number;
  lon: number;
  /** Human-readable display name, e.g. "London, UK". */
  name: string;
}

/** Timezone data returned when CONSTANTS.SCOPES.TIMEZONE is approved. */
export interface TimezoneContext {
  /** IANA timezone string, e.g. "Europe/London". */
  timezone: string;
  /** ISO 8601 local time, e.g. "2026-03-17T14:30:00+00:00". */
  local_time: string;
}

/** Device information returned when CONSTANTS.SCOPES.DEVICE is approved. */
export interface DeviceContext {
  /** "mobile" | "tablet" | "desktop". Compare with CONSTANTS.DEVICE_CLASS. */
  class: "mobile" | "tablet" | "desktop";
  /** OS or platform string, e.g. "macOS", "iOS", "Android", "Windows". */
  platform: string;
}

/** Attention state string. Compare with CONSTANTS.ATTENTION. */
export type AttentionState = "focused" | "ambient" | "distracted";

// ── Scope → return type mapping ───────────────────────────────────────────────

/** Maps each scope key to the TypeScript type ctx.get() returns for it. */
export type ScopeReturnType<T extends string> =
  T extends "location" ? LocationContext :
  T extends "timezone" ? TimezoneContext :
  T extends "device" ? DeviceContext :
  T extends "energy" ? number :
  T extends "attention" ? AttentionState :
  never;

// ── ContextResult ─────────────────────────────────────────────────────────────

/**
 * Typed context accessor returned by getContext().
 *
 * ```ts
 * const ctx = await getContext();
 * const location = ctx.get(CONSTANTS.SCOPES.LOCATION); // LocationContext | undefined
 * const energy   = ctx.get(CONSTANTS.SCOPES.ENERGY);   // number | undefined
 * const attention= ctx.get(CONSTANTS.SCOPES.ATTENTION); // AttentionState | undefined
 * ```
 */
export class ContextResult {
  private readonly _raw: Record<string, unknown>;

  constructor(raw: Record<string, unknown>) {
    this._raw = raw;
  }

  /**
   * Get a context field by scope key.
   * Returns undefined if the user denied the scope or the gateway is unreachable.
   */
  get<T extends string>(scope: T): ScopeReturnType<T> | undefined {
    if (scope === "timezone") {
      const tz = this._raw["timezone"];
      if (tz === undefined) return undefined;
      return { timezone: tz, local_time: this._raw["local_time"] } as ScopeReturnType<T>;
    }
    return this._raw[scope] as ScopeReturnType<T> | undefined;
  }
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

/**
 * All Chalie interface constants under a single namespace.
 *
 * - `CONSTANTS.SCOPES.*`       — scope keys for SCOPES declarations and ctx.get()
 * - `CONSTANTS.ATTENTION.*`    — FOCUSED / AMBIENT / DISTRACTED
 * - `CONSTANTS.ENERGY.*`       — LOW / MEDIUM / HIGH thresholds
 * - `CONSTANTS.DEVICE_CLASS.*` — MOBILE / TABLET / DESKTOP
 */
export const CONSTANTS = {
  /**
   * Scope keys for context declarations and ctx.get() calls.
   * Use as computed property keys in your SCOPES object.
   */
  SCOPES: {
    /** City-level location. ctx.get() → LocationContext | undefined */
    LOCATION: "location" as const,
    /** Timezone + local time. ctx.get() → TimezoneContext | undefined */
    TIMEZONE: "timezone" as const,
    /** Device class + platform. ctx.get() → DeviceContext | undefined */
    DEVICE: "device" as const,
    /** Energy level 0–1. ctx.get() → number | undefined */
    ENERGY: "energy" as const,
    /** Attention state. ctx.get() → AttentionState | undefined */
    ATTENTION: "attention" as const,
  },

  /** Discrete values for the attention context field. */
  ATTENTION: {
    /** User is in deep focus — avoid interruptions. */
    FOCUSED: "focused" as const,
    /** User is available and receptive. */
    AMBIENT: "ambient" as const,
    /** User is context-switching — prefer signals over messages. */
    DISTRACTED: "distracted" as const,
  },

  /**
   * Reference thresholds for the energy context field (0.0–1.0).
   * Use with `<` and `>=`: `energy < CONSTANTS.ENERGY.LOW`
   */
  ENERGY: {
    /** 0.25 — notably low energy, skip non-essential notifications. */
    LOW: 0.25 as const,
    /** 0.5 — baseline, normal behaviour appropriate. */
    MEDIUM: 0.5 as const,
    /** 0.75 — energised, good time for richer content. */
    HIGH: 0.75 as const,
  },

  /** Discrete values for DeviceContext.class. */
  DEVICE_CLASS: {
    MOBILE: "mobile" as const,
    TABLET: "tablet" as const,
    DESKTOP: "desktop" as const,
  },
} as const;
