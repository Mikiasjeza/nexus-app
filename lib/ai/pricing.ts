/**
 * Per-call AI cost, in USD, from token counts.
 *
 * Claude prices are Anthropic's first-party list prices (USD per million
 * tokens). Other providers' prices change often, so they are not hardcoded:
 * set AI_INPUT_COST_PER_MTOK / AI_OUTPUT_COST_PER_MTOK for the model in
 * AI_MODEL. A model with no known price records cost 0 and keeps its token
 * counts, so spend can be recomputed later.
 */

type Price = { input: number; output: number }

const CLAUDE_PRICES: Record<string, Price> = {
  'claude-fable-5-1': { input: 10, output: 50 },
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-opus-5': { input: 5, output: 25 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-sonnet-5': { input: 2, output: 10 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
  'claude-haiku-4-5': { input: 1, output: 5 },
}

function configuredPrice(model: string): Price | null {
  if (model !== process.env.AI_MODEL) return null
  const input = Number(process.env.AI_INPUT_COST_PER_MTOK)
  const output = Number(process.env.AI_OUTPUT_COST_PER_MTOK)
  if (!Number.isFinite(input) || !Number.isFinite(output) || input < 0 || output < 0) return null
  return { input, output }
}

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = CLAUDE_PRICES[model] ?? configuredPrice(model)
  if (!price) return 0
  const cost = (inputTokens * price.input + outputTokens * price.output) / 1_000_000
  return Math.round(cost * 1_000_000) / 1_000_000
}
