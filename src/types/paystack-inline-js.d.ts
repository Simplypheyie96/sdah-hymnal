// @paystack/inline-js ships no type declarations, so we describe the small slice
// of its API the tip jar uses. Kept intentionally narrow — extend if we reach for
// more of the SDK later.
declare module '@paystack/inline-js' {
  interface NewTransactionOptions {
    /** Publishable key, e.g. pk_live_… */
    key: string
    email: string
    /** Amount in the currency's subunit (kobo for NGN). */
    amount: number
    currency?: string
    reference?: string
    /** Restrict the payment methods shown; omit to show all enabled channels. */
    channels?: string[]
    metadata?: Record<string, unknown>
    onSuccess?: (transaction: { reference: string; status: string }) => void
    onCancel?: () => void
    onError?: (error: { message?: string }) => void
  }

  export default class PaystackPop {
    newTransaction(options: NewTransactionOptions): { reference?: string }
  }
}
