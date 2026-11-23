/**
 * Report options shared by the browser (the report dialog) and the server.
 * No database code here: this file ships to the browser.
 */

export const REPORT_TARGETS = ['profile', 'job', 'company'] as const
export type ReportTarget = (typeof REPORT_TARGETS)[number]

export const REPORT_REASONS = {
  spam: 'Spam or advertising',
  fake: 'Fake or misleading',
  scam: 'Scam or fraud',
  offensive: 'Offensive or harassing',
  copyright: 'Uses my work without permission',
  other: 'Something else',
} as const
export type ReportReason = keyof typeof REPORT_REASONS

export const REPORT_STATUSES = ['open', 'actioned', 'dismissed'] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

export const MAX_DETAILS = 1000

export function isReportTarget(value: unknown): value is ReportTarget {
  return typeof value === 'string' && (REPORT_TARGETS as readonly string[]).includes(value)
}

export function isReportReason(value: unknown): value is ReportReason {
  return typeof value === 'string' && value in REPORT_REASONS
}
