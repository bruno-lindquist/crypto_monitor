interface PollUntilOptions<T> {
  poll: () => Promise<T>
  isComplete: (value: T) => boolean
  intervalMs?: number
  maxPolls?: number
}

const DEFAULT_INTERVAL_MS = 2000
const DEFAULT_MAX_POLLS = 15

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function pollUntil<T>({
  poll,
  isComplete,
  intervalMs = DEFAULT_INTERVAL_MS,
  maxPolls = DEFAULT_MAX_POLLS,
}: PollUntilOptions<T>) {
  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    await delay(intervalMs)
    const value = await poll()

    if (isComplete(value)) {
      return true
    }
  }

  return false
}
