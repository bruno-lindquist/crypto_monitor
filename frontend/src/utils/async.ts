export const REFRESH_POLL_INTERVAL_MS = 2000
export const MAX_REFRESH_POLLS = 15

interface PollUntilOptions<T> {
  task: () => Promise<T>
  until: (value: T) => boolean
  signal?: AbortSignal
  intervalMs?: number
  maxAttempts?: number
}

export type PollStatus = 'success' | 'timeout' | 'aborted'

export function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function pollUntil<T>({
  task,
  until,
  signal,
  intervalMs = REFRESH_POLL_INTERVAL_MS,
  maxAttempts = MAX_REFRESH_POLLS,
}: PollUntilOptions<T>) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.aborted) {
      return 'aborted' satisfies PollStatus
    }

    await delay(intervalMs)

    if (signal?.aborted) {
      return 'aborted' satisfies PollStatus
    }

    const value = await task()
    if (until(value)) {
      return 'success' satisfies PollStatus
    }
  }

  return 'timeout' satisfies PollStatus
}
