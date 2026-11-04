/** An error the API can show as-is: a message, an HTTP status, and optional details. */
export class AssessmentError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    /** Extra fields for the JSON response, e.g. { code, upgradeTo }. */
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
  }
}
