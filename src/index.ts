import type { Plugin } from "@elizaos/core";
import { checkTokenRisk } from "./actions/checkTokenRisk";

/**
 * TokenGuard plugin for ElizaOS.
 *
 * Gives any agent a pre-trade safety gate: it checks ERC-20 tokens for
 * honeypots and risk via the TokenGuard API, paying per call with x402
 * (USDC on Base) using the agent's own EVM wallet.
 *
 * Config (via character settings / env):
 *   EVM_PRIVATE_KEY  - agent wallet holding a little USDC on Base (required)
 *   TOKENGUARD_URL   - override the API base URL (optional)
 */
export const tokenGuardPlugin: Plugin = {
  name: "tokenguard",
  description:
    "Pre-trade ERC-20 honeypot & risk checks for autonomous agents, via TokenGuard (pay-per-call x402).",
  actions: [checkTokenRisk],
};

export { checkTokenRisk };
export default tokenGuardPlugin;
