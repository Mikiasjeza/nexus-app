/** A billing problem the API can show as-is, with a machine-readable code. */
export class BillingError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = 'billing_error'
  ) {
    super(message)
  }
}
