/**
 * @module blocks
 *
 * Block builder functions for the Chalie Interface SDK.
 *
 * Interfaces describe their UI as an array of typed block objects.
 * Chalie's frontend renders these blocks using its Radiant design system —
 * interfaces have zero control over styling, only structure and content.
 *
 * @example
 * ```ts
 * import { section, header, text, form, input, actions, button } from "jsr:@chalie/interface-sdk/blocks";
 *
 * function renderInterface() {
 *   return [
 *     section([
 *       header("My App", 2),
 *       text("Welcome to my app"),
 *       form("search", [
 *         input("query", { placeholder: "Search..." }),
 *         actions(button("Go", { execute: "search", collect: "search" }))
 *       ])
 *     ])
 *   ];
 * }
 * ```
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Block {
  type: string;
  [key: string]: unknown;
}

export interface ActionButton {
  label: string;
  execute?: string;
  collect?: string;
  target?: string;
  openUrl?: boolean;
  style?: "primary" | "secondary" | "danger";
  payload?: Record<string, unknown>;
}

export interface PollConfig {
  capability: string;
  interval: number;
  params?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Primitive builders
// ---------------------------------------------------------------------------

/** Text paragraph — plain or inline markdown. */
export function text(content: string, format: "plain" | "markdown" = "markdown"): Block {
  return { type: "text", content, format };
}

/** Heading (level 1–3). */
export function header(content: string, level: 1 | 2 | 3 = 2): Block {
  return { type: "header", content, level };
}

/** Fenced code block with optional language. */
export function code(content: string, language?: string): Block {
  const b: Block = { type: "code", content };
  if (language) b.language = language;
  return b;
}

/** Horizontal divider. */
export function divider(): Block {
  return { type: "divider" };
}

/** Image with alt text. */
export function image(url: string, alt?: string): Block {
  return { type: "image", url, alt: alt ?? "" };
}

/** External link — opens in new tab. */
export function link(url: string, label: string): Block {
  return { type: "link", url, text: label };
}

// ---------------------------------------------------------------------------
// List builders
// ---------------------------------------------------------------------------

/** Bullet or numbered list. */
export function list(items: string[], style: "ordered" | "unordered" = "unordered"): Block {
  return { type: "list", items, style };
}

/** Key-value pairs rendered as a definition list. */
export function keyvalue(pairs: Array<{ key: string; value: string }>): Block {
  return { type: "keyvalue", pairs };
}

/** Data table with headers and rows. */
export function table(headers: string[], rows: string[][]): Block {
  return { type: "table", headers, rows };
}

// ---------------------------------------------------------------------------
// Layout builders
// ---------------------------------------------------------------------------

/** Multi-column grid layout. */
export function columns(...cols: Array<{ width?: string; blocks: Block[] }>): Block {
  return {
    type: "columns",
    columns: cols.map(c => ({ width: c.width ?? "1fr", blocks: c.blocks })),
  };
}

/** Grouped content with optional title. Use collapsible for toggleable sections. */
export function section(blocks: Block[], title?: string, collapsible = false): Block {
  const b: Block = { type: "section", blocks };
  if (title) b.title = title;
  if (collapsible) b.collapsible = true;
  return b;
}

/** Tabbed panel layout. */
export function tabs(...tabDefs: Array<{ label: string; blocks: Block[] }>): Block {
  return { type: "tabs", tabs: tabDefs };
}

/**
 * Named container — target for dynamic content updates.
 * When `poll` is provided, the frontend will periodically call the
 * specified capability and replace the container's contents.
 */
export function container(id: string, blocks: Block[], poll?: PollConfig): Block {
  const b: Block = { type: "container", id, blocks };
  if (poll) b.poll = poll;
  return b;
}

// ---------------------------------------------------------------------------
// Form builders
// ---------------------------------------------------------------------------

/** Text input field. */
export function input(
  name: string,
  opts: { placeholder?: string; value?: string; type?: string } = {},
): Block {
  const b: Block = { type: "input", name };
  if (opts.placeholder) b.placeholder = opts.placeholder;
  if (opts.value != null) b.value = opts.value;
  if (opts.type) b.inputType = opts.type;
  return b;
}

/** Dropdown select. */
export function select(
  name: string,
  options: Array<{ label: string; value: string }>,
  value?: string,
): Block {
  const b: Block = { type: "select", name, options };
  if (value != null) b.value = value;
  return b;
}

/** On/off toggle switch. */
export function toggle(name: string, label: string, value = false): Block {
  return { type: "toggle", name, label, value };
}

/** Groups form fields for collection by action buttons. */
export function form(id: string, blocks: Block[]): Block {
  return { type: "form", id, blocks };
}

// ---------------------------------------------------------------------------
// Feedback builders
// ---------------------------------------------------------------------------

/** Inline status badge. */
export function badge(
  label: string,
  variant: "info" | "success" | "warning" | "error" = "info",
): Block {
  return { type: "badge", text: label, variant };
}

/** Message banner with accent border. */
export function alert(
  message: string,
  variant: "info" | "success" | "warning" | "error" = "info",
): Block {
  return { type: "alert", message, variant };
}

/** Loading spinner with optional label. */
export function loading(label?: string): Block {
  const b: Block = { type: "loading" };
  if (label) b.label = label;
  return b;
}

// ---------------------------------------------------------------------------
// Action builders
// ---------------------------------------------------------------------------

/**
 * Creates an action button descriptor.
 *
 * - `execute`: capability name to call on the daemon via gateway
 * - `collect`: ID of a `form` block — field values are sent as params
 * - `target`: ID of a `container` block — response blocks replace its content
 * - `openUrl`: if true, opens the response's `openUrl` field in a new tab
 * - `style`: visual variant (primary, secondary, danger)
 * - `payload`: static params merged with collected form values
 */
export function button(
  label: string,
  opts: {
    execute?: string;
    collect?: string;
    target?: string;
    openUrl?: boolean;
    style?: "primary" | "secondary" | "danger";
    payload?: Record<string, unknown>;
  } = {},
): ActionButton {
  return { label, ...opts };
}

/** Row of action buttons. */
export function actions(...buttons: ActionButton[]): Block {
  return { type: "actions", buttons };
}
