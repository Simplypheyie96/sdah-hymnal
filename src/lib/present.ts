// Casting a hymn to a television.
//
// Two different things get called "presenting", and they behave differently:
//
//   Casting (Presentation API) — the TV loads the hymn itself and the phone
//   becomes a remote. Chrome and Edge on Android, Windows and macOS can do
//   this with a Chromecast or a smart TV that speaks Cast.
//
//   Mirroring (AirPlay / Cast screen share) — the TV shows whatever is on the
//   phone. The user starts it from the operating system; a web page cannot.
//   This is the only route on iPhone and iPad, because Safari implements no
//   part of the Presentation API.
//
// So the app offers casting where it exists and explains mirroring where it
// does not, rather than pretending one button does both.

type PresentationConnection = {
  id: string
  state: 'connecting' | 'connected' | 'closed' | 'terminated'
  send: (message: string) => void
  close: () => void
  terminate: () => void
  onmessage: ((e: MessageEvent) => void) | null
  onclose: (() => void) | null
  onterminate: (() => void) | null
}

type PresentationRequestCtor = new (urls: string[]) => {
  start: () => Promise<PresentationConnection>
  getAvailability?: () => Promise<{ value: boolean }>
}

type PresentationReceiver = {
  connectionList: Promise<{
    connections: PresentationConnection[]
    onconnectionavailable: ((e: { connection: PresentationConnection }) => void) | null
  }>
}

const PresentationRequest = (globalThis as { PresentationRequest?: PresentationRequestCtor })
  .PresentationRequest

/** True when this browser can hand a page to a television by itself. */
export const canCast = (): boolean => typeof PresentationRequest === 'function'

/** True when the running page IS the television's copy. */
export const isReceiver = (): boolean =>
  typeof navigator !== 'undefined' &&
  Boolean((navigator as Navigator & { presentation?: { receiver?: unknown } }).presentation?.receiver)

/** The URL the television should open for a given hymn. */
export function receiverUrl(songId: string, lang: string): string {
  const u = new URL(window.location.href)
  u.hash = ''
  u.search = `?present=${encodeURIComponent(songId)}&lang=${encodeURIComponent(lang)}`
  return u.toString()
}

export type CastSession = {
  /** Move the television to a given verse. */
  showVerse: (index: number) => void
  /** End the session and clear the television. */
  stop: () => void
}

/**
 * Ask the user to pick a television, then open the hymn on it.
 * Resolves once the connection is live; rejects if no device is chosen.
 */
export async function castHymn(
  songId: string,
  lang: string,
  onClosed?: () => void,
): Promise<CastSession> {
  if (!PresentationRequest) throw new Error('Casting is not supported in this browser')

  const request = new PresentationRequest([receiverUrl(songId, lang)])
  const connection = await request.start() // shows the device picker

  const send = (payload: unknown) => {
    if (connection.state === 'connected') connection.send(JSON.stringify(payload))
  }

  connection.onclose = () => onClosed?.()
  connection.onterminate = () => onClosed?.()

  return {
    showVerse: (index: number) => send({ type: 'verse', index }),
    stop: () => {
      try {
        connection.terminate()
      } catch {
        connection.close()
      }
      onClosed?.()
    },
  }
}

/**
 * On the television: listen for verse changes from the phone.
 * Returns an unsubscribe function.
 */
export function onControllerMessage(handler: (msg: { type: string; index?: number }) => void): () => void {
  const receiver = (navigator as Navigator & { presentation?: { receiver?: PresentationReceiver } })
    .presentation?.receiver
  if (!receiver) return () => {}

  let cancelled = false
  const attach = (c: PresentationConnection) => {
    c.onmessage = (e: MessageEvent) => {
      try {
        handler(JSON.parse(String(e.data)))
      } catch {
        /* ignore anything we did not send */
      }
    }
  }

  void receiver.connectionList.then((list) => {
    if (cancelled) return
    list.connections.forEach(attach)
    list.onconnectionavailable = (e) => attach(e.connection)
  })

  return () => {
    cancelled = true
  }
}
