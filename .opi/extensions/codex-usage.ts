/** @jsxImportSource @opentui/solid */
import { defineExtension } from "opencode/opi"
import { createStatus } from "opencode/opi/render"
import { useTheme } from "@/cli/cmd/tui/context/theme"

// Codex usage types
interface UsageWindow {
  used_percent?: number | null
  reset_after_seconds?: number | null
  reset_at?: number | null
}

interface RateLimitBucket {
  allowed?: boolean
  limit_reached?: boolean
  primary_window?: UsageWindow | null
  secondary_window?: UsageWindow | null
}

interface CodexUsageResponse {
  rate_limit?: RateLimitBucket | null
  additional_rate_limits?: Record<string, unknown> | unknown[] | null
}

interface UsageSnapshot {
  fiveHourLeftPercent: number | null
  sevenDayLeftPercent: number | null
  fiveHourResetInSeconds: number | null
  sevenDayResetInSeconds: number | null
  isLimited: boolean
}

// Configuration
type PercentDisplayMode = "left" | "used"
type ResetWindowMode = "5h" | "7d"

const EXTENSION_ID = "codex-usage"
const SETTINGS_KEY = "opi-codex-usage"
const REFRESH_INTERVAL_MS = 60_000
const USAGE_URL = "https://chatgpt.com/backend-api/wham/usage"

const SPARK_MODEL_ID = "gpt-5.3-codex-spark"
const SPARK_LIMIT_NAME = "GPT-5.3-Codex-Spark"

// Helper functions
function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

function usedToLeftPercent(value: number | null | undefined): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null
  return clampPercent(100 - value)
}

function leftToUsedPercent(value: number | null | undefined): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null
  return clampPercent(100 - value)
}

function formatResetCountdown(seconds: number | null): string | null {
  if (typeof seconds !== "number" || Number.isNaN(seconds)) return null
  const total = Math.max(0, Math.round(seconds))
  const days = Math.floor(total / 86_400)
  const hours = Math.floor((total % 86_400) / 3_600)
  const minutes = Math.floor((total % 3_600) / 60)

  if (days > 0) return `${days}d${hours}h`
  if (hours > 0) return `${hours}h${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return `${total}s`
}

function isSparkModel(modelId: string | undefined): boolean {
  return modelId === SPARK_MODEL_ID
}

// State management
let percentDisplayMode: PercentDisplayMode = "left"
let resetWindowMode: ResetWindowMode = "7d"
let lastUsageSnapshot: UsageSnapshot | undefined
let refreshTimer: ReturnType<typeof setInterval> | undefined
let currentSessionID: string | undefined

// Parse usage response
function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function normalizeRateLimitBucket(value: unknown): RateLimitBucket | null {
  const record = asObject(value)
  if (!record) return null
  if (!("primary_window" in record || "secondary_window" in record || "limit_reached" in record || "allowed" in record)) {
    return null
  }
  return record as RateLimitBucket
}

function extractSparkRateLimitFromEntry(value: unknown): RateLimitBucket | null {
  const record = asObject(value)
  if (!record) return null
  if (typeof record.limit_name !== "string" || record.limit_name.trim() !== SPARK_LIMIT_NAME) return null
  return normalizeRateLimitBucket(record.rate_limit)
}

function findSparkRateLimitBucket(data: CodexUsageResponse): RateLimitBucket | null {
  const additional = data.additional_rate_limits
  if (Array.isArray(additional)) {
    for (const entry of additional) {
      const bucket = extractSparkRateLimitFromEntry(entry)
      if (bucket) return bucket
    }
  } else {
    const additionalMap = asObject(additional)
    if (additionalMap) {
      for (const value of Object.values(additionalMap)) {
        const bucket = extractSparkRateLimitFromEntry(value)
        if (bucket) return bucket
      }
    }
  }
  return null
}

function selectRateLimitBucket(data: CodexUsageResponse, modelId: string | undefined): RateLimitBucket | null {
  if (isSparkModel(modelId)) {
    return findSparkRateLimitBucket(data)
  }
  return normalizeRateLimitBucket(data.rate_limit)
}

function getResetSeconds(window: UsageWindow | null | undefined): number | null {
  const resetAfterSeconds = window?.reset_after_seconds
  if (typeof resetAfterSeconds === "number" && !Number.isNaN(resetAfterSeconds)) {
    return resetAfterSeconds
  }

  const resetAt = window?.reset_at
  if (typeof resetAt !== "number" || Number.isNaN(resetAt)) return null

  const resetAtSeconds = resetAt > 100_000_000_000 ? resetAt / 1000 : resetAt
  return Math.max(0, resetAtSeconds - Date.now() / 1000)
}

function parseUsageSnapshot(data: CodexUsageResponse, modelId: string | undefined): UsageSnapshot {
  const selectedBucket = selectRateLimitBucket(data, modelId)
  const fiveHourWindow = selectedBucket?.primary_window
  const fiveHourValue = fiveHourWindow?.used_percent
  const sevenDayWindow = selectedBucket?.secondary_window
  const sevenDayValue = sevenDayWindow?.used_percent

  return {
    fiveHourLeftPercent: usedToLeftPercent(fiveHourValue),
    sevenDayLeftPercent: usedToLeftPercent(sevenDayValue),
    fiveHourResetInSeconds: getResetSeconds(fiveHourWindow),
    sevenDayResetInSeconds: getResetSeconds(sevenDayWindow),
    isLimited: selectedBucket?.limit_reached === true || selectedBucket?.allowed === false,
  }
}

// Fetch usage data
async function requestUsageJson(): Promise<CodexUsageResponse> {
  // Note: In a real implementation, you'd need to get auth credentials
  // For now, this is a placeholder that would need auth setup
  const response = await fetch(USAGE_URL, {
    headers: {
      accept: "*/*",
      // Authorization would need to be added here
    },
  })

  if (!response.ok) throw new Error(`Codex usage request failed (${response.status})`)
  return (await response.json()) as CodexUsageResponse
}

// Format status text
function formatStatusText(usage: UsageSnapshot, mode: PercentDisplayMode, windowMode: ResetWindowMode, modelId: string | undefined): string {
  const label = isSparkModel(modelId) ? "Codex Spark" : "Codex"
  const fiveHourLeft = usage.fiveHourLeftPercent
  const sevenDayLeft = usage.sevenDayLeftPercent

  const fiveHourDisplay = mode === "left" ? fiveHourLeft : leftToUsedPercent(fiveHourLeft)
  const sevenDayDisplay = mode === "left" ? sevenDayLeft : leftToUsedPercent(sevenDayLeft)

  const fiveHourText = typeof fiveHourDisplay === "number" ? `${Math.round(fiveHourDisplay)}%` : "--"
  const sevenDayText = typeof sevenDayDisplay === "number" ? `${Math.round(sevenDayDisplay)}%` : "--"

  const resetSeconds = windowMode === "5h" ? usage.fiveHourResetInSeconds : usage.sevenDayResetInSeconds
  const resetText = formatResetCountdown(resetSeconds)
  const resetLabel = windowMode === "5h" ? "5h" : "7d"
  const resetStatus = resetText ? ` (${resetLabel}:↺${resetText})` : ""

  const modeText = mode === "left" ? "left" : "used"

  return `${label} 5h:${fiveHourText} ${modeText} 7d:${sevenDayText} ${modeText}${resetStatus}`
}

// Update status
async function updateStatus(opi: any, modelId?: string): Promise<void> {
  try {
    const usage = parseUsageSnapshot(await requestUsageJson(), modelId)
    lastUsageSnapshot = usage
    const statusText = formatStatusText(usage, percentDisplayMode, resetWindowMode, modelId)
    opi.ui.setStatus(EXTENSION_ID, statusText)
  } catch (error) {
    const label = isSparkModel(modelId) ? "Codex Spark" : "Codex"
    opi.ui.setStatus(EXTENSION_ID, `${label} unavailable`)
  }
}

// Start auto-refresh
function startAutoRefresh(opi: any): void {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = setInterval(() => {
    void updateStatus(opi)
  }, REFRESH_INTERVAL_MS)
}

// Stop auto-refresh
function stopAutoRefresh(opi: any): void {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = undefined
  }
  opi.ui.setStatus(EXTENSION_ID, undefined)
}

// Export extension
export default defineExtension((opi) => {
  // Initialize settings from storage (simplified - in real implementation would read from file)
  percentDisplayMode = "left"
  resetWindowMode = "7d"

  // Session lifecycle events
  opi.on("session.start", ({ sessionID }) => {
    currentSessionID = sessionID
    startAutoRefresh(opi)
    void updateStatus(opi)
  })

  opi.on("message.assistant", () => {
    void updateStatus(opi)
  })

  opi.on("session.end", () => {
    stopAutoRefresh(opi)
    currentSessionID = undefined
  })

  // Note: opi doesn't have built-in commands like Pi
  // The display mode and reset window mode would need to be:
  // 1. Configured via environment variables
  // 2. Added as tools that the user can call
  // 3. Implemented via a config file that the extension reads

  // For now, we'll use environment variables for configuration
  const envMode = process.env.OPI_CODEX_USAGE_MODE as PercentDisplayMode
  if (envMode === "left" || envMode === "used") {
    percentDisplayMode = envMode
  }

  const envWindow = process.env.OPI_CODEX_USAGE_WINDOW as ResetWindowMode
  if (envWindow === "5h" || envWindow === "7d") {
    resetWindowMode = envWindow
  }
})
