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
  const response = await fetch(USAGE_URL, {
    headers: {
      accept: "*/*",
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

// Command argument completions
function getModeArgumentCompletions(argumentPrefix: string) {
  const prefix = argumentPrefix.trim().toLowerCase()
  const items = [
    {
      value: "left",
      label: "left",
      description: 'Shows: "Codex 5h:81% left 7d:64% left" (Spark model: "Codex Spark 5h:81% left 7d:64% left")',
    },
    {
      value: "used",
      label: "used",
      description: 'Shows: "Codex 5h:19% used 7d:36% used" (Spark model: "Codex Spark 5h:19% used 7d:36% used")',
    },
    {
      value: "toggle",
      label: "toggle",
      description: 'Flips between "... left" and "... used"',
    },
  ]

  if (!prefix) return items
  const filtered = items.filter((item) => item.value.startsWith(prefix))
  return filtered.length > 0 ? filtered : null
}

function getResetWindowArgumentCompletions(argumentPrefix: string) {
  const prefix = argumentPrefix.trim().toLowerCase()
  const items = [
    {
      value: "5h",
      label: "5h",
      description: 'Shows reset countdown as "(5h:↺...)"',
    },
    {
      value: "7d",
      label: "7d",
      description: 'Shows reset countdown as "(7d:↺...)"',
    },
    {
      value: "toggle",
      label: "toggle",
      description: 'Flips reset countdown window between "5h" and "7d"',
    },
  ]

  if (!prefix) return items
  const filtered = items.filter((item) => item.value.startsWith(prefix))
  return filtered.length > 0 ? filtered : null
}

// Export extension
export default defineExtension((opi) => {
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

  // Register commands
  opi.registerCommand("codex-usage-mode", {
    description: "Toggle Codex usage display mode, or set it explicitly: left | used | toggle",
    getArgumentCompletions: getModeArgumentCompletions,
    handler: async (args) => {
      const token = args.trim().toLowerCase().split(/\s+/)[0] ?? ""
      
      if (!token || token === "toggle") {
        percentDisplayMode = percentDisplayMode === "left" ? "used" : "left"
      } else if (token === "left" || token === "used") {
        percentDisplayMode = token as PercentDisplayMode
      } else {
        opi.ui.notify({
          message: `Invalid mode: ${token}. Use "left", "used", or "toggle"`,
          variant: "warning",
        })
        return
      }

      if (lastUsageSnapshot) {
        const statusText = formatStatusText(lastUsageSnapshot, percentDisplayMode, resetWindowMode, undefined)
        opi.ui.setStatus(EXTENSION_ID, statusText)
      } else {
        void updateStatus(opi)
      }

      opi.ui.notify({
        message: `Codex usage mode set to: ${percentDisplayMode}`,
        variant: "success",
      })
    },
  })

  opi.registerCommand("codex-usage-reset-window", {
    description: "Toggle reset countdown window, or set it explicitly: 5h | 7d | toggle",
    getArgumentCompletions: getResetWindowArgumentCompletions,
    handler: async (args) => {
      const token = args.trim().toLowerCase().split(/\s+/)[0] ?? ""
      
      if (!token || token === "toggle") {
        resetWindowMode = resetWindowMode === "7d" ? "5h" : "7d"
      } else if (token === "5h" || token === "7d") {
        resetWindowMode = token as ResetWindowMode
      } else {
        opi.ui.notify({
          message: `Invalid window: ${token}. Use "5h", "7d", or "toggle"`,
          variant: "warning",
        })
        return
      }

      if (lastUsageSnapshot) {
        const statusText = formatStatusText(lastUsageSnapshot, percentDisplayMode, resetWindowMode, undefined)
        opi.ui.setStatus(EXTENSION_ID, statusText)
      } else {
        void updateStatus(opi)
      }

      opi.ui.notify({
        message: `Reset window set to: ${resetWindowMode}`,
        variant: "success",
      })
    },
  })
})
