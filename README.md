# @keich2realg/plugin-tokenguard

A pre-trade **safety gate** for ElizaOS agents. Before your agent buys an ERC-20
token, this plugin checks it for **honeypots, high taxes, and low liquidity** via
the [**TokenGuard**](https://tokenguard-api-sssu.onrender.com) API — paying
**per call via x402** (USDC on Base) with the agent's own EVM wallet. No API key,
no signup.

One avoided honeypot pays for ~30,000 checks.

## What it adds

An action **`CHECK_TOKEN_RISK`** that triggers whenever a message contains an
ERC-20 address. It returns a verdict the agent can act on:

```
Verdict: SAFE (risk 0/100), honeypot: no, buy tax 0%, sell tax 0%, liquidity $25,477,531.
```

Chains: `base`, `ethereum`, `bsc` (the agent pays on Base regardless).

## Install

```bash
elizaos plugins add @keich2realg/plugin-tokenguard
# or
npm install @keich2realg/plugin-tokenguard
```

## Configure

The plugin needs the agent's EVM wallet (with a little USDC on Base) to pay per
call. Add to your character/env:

```env
EVM_PRIVATE_KEY=0x...            # required — agent wallet, small USDC balance on Base
TOKENGUARD_URL=https://tokenguard-api-sssu.onrender.com   # optional override
```

Then register the plugin in your character:

```ts
import { tokenGuardPlugin } from "@keich2realg/plugin-tokenguard";

export const character = {
  name: "MyTrader",
  plugins: [tokenGuardPlugin],
  // ...
};
```

## How it works

```
message with 0x token ─▶ CHECK_TOKEN_RISK
                              │  createSigner("base", EVM_PRIVATE_KEY)
                              │  wrapFetchWithPayment(fetch, signer)   ← x402, gasless
                              ▼
                       GET TokenGuard /check  ─▶  {verdict, risk_score, taxes, liquidity}
                              ▼
                       agent replies / decides
```

The payment is gasless (the facilitator covers gas); the agent only needs USDC.
The default per-call cap is 0.10 USDC; a check costs $0.015.

## Security

Use a **dedicated agent wallet** with a small balance. `EVM_PRIVATE_KEY` is read
from settings only and never logged.

## Build

```bash
npm install
npm run build      # tsup -> dist/
npm run typecheck
```

## Links

- TokenGuard API & docs: https://tokenguard-api-sssu.onrender.com/docs
- Example agent (Python): https://github.com/keich2realg/tokenguard-agent-example
- x402: https://x402.org

MIT
