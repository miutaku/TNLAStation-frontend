import { describe, expect, it } from "vitest";

import type { LiveStreamInfoItem } from "@/lib/api/types";

import { distinctStreamClientCount, parseStreamClient } from "./stream-clients-dialog";

function stream(streamId: number, client?: string, structured?: { clientIp?: string; userAgent?: string }): LiveStreamInfoItem {
  return {
    streamId,
    type: "LiveHLS",
    mode: 0,
    isEnable: true,
    channelId: 1,
    name: "番組",
    startAt: 1,
    endAt: 2,
    client,
    ...structured,
  };
}

describe("stream client details", () => {
  it("separates the IP address and User-Agent", () => {
    expect(parseStreamClient("192.168.20.15 (Mozilla/5.0 (Windows NT 10.0; Win64; x64))")).toEqual({
      ipAddress: "192.168.20.15",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });
  });

  it("keeps legacy client labels as the address field", () => {
    expect(parseStreamClient("PVR Live")).toEqual({ ipAddress: "PVR Live", userAgent: null });
    expect(parseStreamClient()).toEqual({ ipAddress: null, userAgent: null });
  });

  it("counts distinct identified devices independently from stream count", () => {
    expect(distinctStreamClientCount([
      stream(1, "192.168.20.15 (Chrome)"),
      stream(2, "192.168.20.15 (Chrome)"),
      stream(3, "192.168.20.16 (Safari)"),
      stream(4),
    ])).toBe(2);
  });

  it("uses structured client fields instead of the legacy label", () => {
    expect(distinctStreamClientCount([
      stream(1, "legacy-one", { clientIp: "192.168.20.15", userAgent: "Chrome" }),
      stream(2, "legacy-two", { clientIp: "192.168.20.15", userAgent: "Chrome" }),
    ])).toBe(1);
  });
});
