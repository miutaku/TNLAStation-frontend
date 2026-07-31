import { describe, expect, it, vi } from "vitest";

import { waitForPlaylist } from "./playlist-readiness";

const noDelay = () => Promise.resolve();

function respondingAfter(attempts: number): typeof fetch {
  let seen = 0;
  return vi.fn(async () => {
    seen += 1;
    return new Response(null, { status: seen < attempts ? 404 : 200 });
  }) as unknown as typeof fetch;
}

describe("waitForPlaylist", () => {
  it("returns as soon as the playlist answers", async () => {
    const fetcher = respondingAfter(1);

    await expect(waitForPlaylist("/p.m3u8", () => false, { fetcher, delay: noDelay })).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("keeps asking while the配信サーバー still answers 404", async () => {
    const fetcher = respondingAfter(5);

    await expect(waitForPlaylist("/p.m3u8", () => false, { fetcher, delay: noDelay })).resolves.toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(5);
  });

  it("treats a network failure as not ready yet", async () => {
    let seen = 0;
    const fetcher = vi.fn(async () => {
      seen += 1;
      if (seen === 1) throw new TypeError("Failed to fetch");
      return new Response(null, { status: 200 });
    }) as unknown as typeof fetch;

    await expect(waitForPlaylist("/p.m3u8", () => false, { fetcher, delay: noDelay })).resolves.toBe(true);
  });

  it("gives up once the deadline passes so the画面 can show a reason", async () => {
    const fetcher = respondingAfter(Number.MAX_SAFE_INTEGER);
    let clock = 0;

    await expect(
      waitForPlaylist("/p.m3u8", () => false, { fetcher, delay: noDelay, now: () => (clock += 10_000) }),
    ).resolves.toBe(false);
  });

  it("stops when the viewer left the page", async () => {
    const fetcher = respondingAfter(Number.MAX_SAFE_INTEGER);

    await expect(waitForPlaylist("/p.m3u8", () => true, { fetcher, delay: noDelay })).resolves.toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
