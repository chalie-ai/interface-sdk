# @chalie/interface-sdk

TypeScript SDK for building [Chalie](https://github.com/chalie-ai/chalie) interfaces.

```ts
import { createDaemon, sendSignal, getContext, CONSTANTS, hours } from "jsr:@chalie/interface-sdk";
```

## Usage

See the [interface-template](https://github.com/chalie-ai/interface-template) for a complete working example.

```ts
import { createDaemon, sendSignal, getContext, CONSTANTS, hours } from "jsr:@chalie/interface-sdk";

createDaemon({
  name: "Weather",
  version: "1.0.0",
  description: "Current conditions and forecasts",
  author: "Your Name",

  scopes: {
    context: {
      [CONSTANTS.SCOPES.LOCATION]: "Required for weather at your current city",
    },
    signals: {
      forecast_update: "Hourly weather updates added to Chalie's awareness",
    },
  },

  capabilities: [
    {
      name: "get_forecast",
      description: "Get weather forecast. Use when the user asks about weather.",
      parameters: [
        { name: "location", type: "string", required: false, description: "City name" },
      ],
    },
  ],

  polls: [
    {
      name: "hourly-forecast",
      every: hours(1),
      async run() {
        const location = (await getContext()).get(CONSTANTS.SCOPES.LOCATION);
        if (!location) return;
        await sendSignal("forecast_update", `Weather for ${location.name}: ...`, 0.4);
      },
    },
  ],

  async executeCommand(capability, params) {
    if (capability === "get_forecast") {
      return { text: "Sunny, 22°C.", data: { temp: 22 }, error: null };
    }
    return { error: `Unknown capability: ${capability}` };
  },

  async renderInterface() {
    const location = (await getContext()).get(CONSTANTS.SCOPES.LOCATION);
    return `<div><h1>Weather in ${location?.name ?? "your location"}</h1></div>`;
  },
});
```

## API

### `createDaemon(config)`

Starts the daemon. Reads `--gateway`, `--port`, `--data-dir` from process arguments automatically.

### `sendSignal(type, content, energy?, metadata?)`

Push passive background knowledge to Chalie's world state. Zero LLM cost.

### `sendMessage(text, topic?, metadata?)`

Push a message to Chalie's reasoning loop. Costs LLM tokens — use sparingly.

### `getContext()`

Returns a `ContextResult`. Call `.get(CONSTANTS.SCOPES.*)` for typed access.

```ts
const ctx = await getContext();
ctx.get(CONSTANTS.SCOPES.LOCATION)  // LocationContext | undefined
ctx.get(CONSTANTS.SCOPES.ENERGY)    // number | undefined
ctx.get(CONSTANTS.SCOPES.ATTENTION) // AttentionState | undefined
```

### `CONSTANTS`

| Namespace | Values |
|-----------|--------|
| `CONSTANTS.SCOPES` | `LOCATION` `TIMEZONE` `DEVICE` `ENERGY` `ATTENTION` |
| `CONSTANTS.ATTENTION` | `FOCUSED` `AMBIENT` `DISTRACTED` |
| `CONSTANTS.ENERGY` | `LOW` (0.25) `MEDIUM` (0.5) `HIGH` (0.75) |
| `CONSTANTS.DEVICE_CLASS` | `MOBILE` `TABLET` `DESKTOP` |

### Interval helpers

`seconds(n)` `minutes(n)` `hours(n)` `days(n)` — convert to milliseconds for `Poll.every`.

## License

Apache 2.0
