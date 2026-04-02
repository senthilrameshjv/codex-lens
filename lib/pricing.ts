/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ModelUsage, TurnUsage } from '@/types/claude'

interface ModelPricing {
  input: number
  output: number
  cacheWrite: number
  cacheRead: number
}

const ZERO_PRICING: ModelPricing = {
  input: 0,
  output: 0,
  cacheWrite: 0,
  cacheRead: 0,
}

export const PRICING: Record<string, ModelPricing> = {}

function getPricing(): ModelPricing {
  return ZERO_PRICING
}

export function estimateCostFromUsage(..._args: [string, TurnUsage]): number {
  return 0
}

export function estimateCostFromSessionMeta(..._args: [string, number, number]): number {
  return 0
}

export interface CacheEfficiencyResult {
  savedUSD: number
  hitRate: number
  wouldHavePaidUSD: number
}

export function cacheEfficiency(...args: [string, ModelUsage]): CacheEfficiencyResult {
  const usage = args[1]
  const totalContext = usage.inputTokens + usage.cacheReadInputTokens
  return {
    savedUSD: 0,
    hitRate: totalContext > 0 ? usage.cacheReadInputTokens / totalContext : 0,
    wouldHavePaidUSD: 0,
  }
}

export function estimateTotalCostFromModel(..._args: [string, ModelUsage]): number {
  return 0
}

export { getPricing }
export type { ModelPricing }
