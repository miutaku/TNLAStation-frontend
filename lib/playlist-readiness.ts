const READY_TIMEOUT_MS = 45_000;
const RETRY_INTERVAL_MS = 400;

interface WaitDeps {
  fetcher?: typeof fetch;
  delay?: (ms: number) => Promise<void>;
  now?: () => number;
}

/**
 * プレイリストが取れるようになるまで待つ。LL-HLS は配信サーバー側で作られ、始まるまで 404 を返す。
 * 確かめずに渡すと、再試行を持たない再生機 (iOS の native HLS) はその場で諦める。
 */
export async function waitForPlaylist(
  url: string,
  isCancelled: () => boolean,
  deps: WaitDeps = {},
): Promise<boolean> {
  const fetcher = deps.fetcher ?? fetch;
  const delay = deps.delay ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const now = deps.now ?? Date.now;
  const deadline = now() + READY_TIMEOUT_MS;

  while (!isCancelled()) {
    if (await respondsOk(fetcher, url)) return true;
    if (now() >= deadline) return false;
    await delay(RETRY_INTERVAL_MS);
  }
  return false;
}

async function respondsOk(fetcher: typeof fetch, url: string): Promise<boolean> {
  try {
    const response = await fetcher(url, { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}
