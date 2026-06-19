import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  ActionResult,
} from "@elizaos/core";
import { createSigner, wrapFetchWithPayment } from "x402-fetch";

const TOKEN_RE = /0x[a-fA-F0-9]{40}/;
const CHAIN_RE = /\b(base|ethereum|eth|bsc|binance)\b/i;

function parseChain(text: string): string {
  const m = text.match(CHAIN_RE);
  if (!m) return "base";
  const c = m[1].toLowerCase();
  if (c === "eth") return "ethereum";
  if (c === "binance") return "bsc";
  return c;
}

/**
 * CHECK_TOKEN_RISK — pre-trade safety gate.
 * Given an ERC-20 token address, calls the TokenGuard API for a honeypot / risk
 * report, paying per call via x402 with the agent's EVM wallet (gasless).
 */
export const checkTokenRisk: Action = {
  name: "CHECK_TOKEN_RISK",
  similes: ["TOKEN_SAFETY_CHECK", "HONEYPOT_CHECK", "RUG_CHECK", "TOKEN_RISK", "IS_TOKEN_SAFE"],
  description:
    "Check an ERC-20 token for honeypot / rug risk before buying, using TokenGuard " +
    "(pay-per-call via x402). Returns verdict, risk score, buy/sell tax and liquidity.",

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    return TOKEN_RE.test(message.content?.text ?? "");
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    const text = message.content?.text ?? "";
    const token = text.match(TOKEN_RE)?.[0];
    const chain = parseChain(text);

    if (!token) {
      await callback?.({ text: "I couldn't find a token address (0x...) to check." });
      return { success: false, text: "No token address found." };
    }

    const privateKey =
      (runtime.getSetting("EVM_PRIVATE_KEY") as string | undefined) ||
      (runtime.getSetting("WALLET_PRIVATE_KEY") as string | undefined);

    if (!privateKey) {
      const msg =
        "No agent wallet configured. Set EVM_PRIVATE_KEY (a wallet with a little USDC on Base) to pay for token risk checks.";
      await callback?.({ text: msg });
      return { success: false, text: msg };
    }

    const base =
      (runtime.getSetting("TOKENGUARD_URL") as string | undefined) ||
      "https://tokenguard-api-sssu.onrender.com";
    const url = `${base}/check?token=${token}&chain=${chain}`;

    try {
      const signer = await createSigner("base", privateKey);
      const fetchWithPay = wrapFetchWithPayment(fetch, signer);
      const res = await fetchWithPay(url);
      const report = (await res.json()) as Record<string, unknown>;

      const verdict = String(report.verdict ?? "UNKNOWN");
      const score = report.risk_score ?? "?";
      const honeypot = report.is_honeypot ? "YES" : "no";
      const summary =
        `TokenGuard — ${token} on ${chain}\n` +
        `Verdict: ${verdict} (risk ${score}/100), honeypot: ${honeypot}, ` +
        `buy tax ${report.buy_tax ?? "?"}%, sell tax ${report.sell_tax ?? "?"}%, ` +
        `liquidity $${report.liquidity_usd ?? "?"}.`;

      await callback?.({ text: summary, data: report });
      return { success: true, text: summary, data: report };
    } catch (err) {
      const msg = `TokenGuard check failed: ${err instanceof Error ? err.message : String(err)}`;
      await callback?.({ text: msg });
      return { success: false, text: msg, error: err instanceof Error ? err : new Error(msg) };
    }
  },

  examples: [
    [
      {
        name: "{{user}}",
        content: { text: "Is 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 on base safe to buy?" },
      },
      {
        name: "{{agent}}",
        content: {
          text: "Let me run a pre-trade risk check via TokenGuard.",
          actions: ["CHECK_TOKEN_RISK"],
        },
      },
    ],
    [
      {
        name: "{{user}}",
        content: { text: "Check this token for honeypot before I ape: 0xabc...def on bsc" },
      },
      {
        name: "{{agent}}",
        content: { text: "Checking honeypot / rug risk now.", actions: ["CHECK_TOKEN_RISK"] },
      },
    ],
  ],
};

export default checkTokenRisk;
