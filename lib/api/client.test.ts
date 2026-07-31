import { describe, expect, it, vi } from "vitest";

import { ApiError, appendQuery, EpgStationApiClient, swaggerUrlFromApiBase } from "./client";
import {
  channelsFixture,
  encodeFixture,
  recordedDetailFixture,
  recordingFixture,
  rulesFixture,
  scheduleSearchFixture,
  storagesFixture,
  streamsFixture,
} from "./fixtures";

describe("appendQuery", () => {
  it("keeps false and zero while skipping empty values", () => {
    expect(appendQuery("/api/reserves", { isHalfWidth: false, offset: 0, keyword: "", type: undefined })).toBe(
      "/api/reserves?isHalfWidth=false&offset=0",
    );
  });
});

describe("swaggerUrlFromApiBase", () => {
  it("builds Swagger UI URLs for default, subdirectory, and cross-origin API bases", () => {
    expect(swaggerUrlFromApiBase("/api")).toBe("/api-docs/?url=/api/docs");
    expect(swaggerUrlFromApiBase("/epg/api/")).toBe("/epg/api-docs/?url=/epg/api/docs");
    expect(swaggerUrlFromApiBase("https://tv.example.com/api")).toBe(
      "https://tv.example.com/api-docs/?url=https://tv.example.com/api/docs",
    );
  });
});

describe("EpgStationApiClient", () => {
  it("uses the existing config and version endpoints", async () => {
    const requested: string[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      requested.push(String(input));
      return new Response(JSON.stringify(String(input).endsWith("/version") ? { version: "3.0.0" } : {}), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...(String(input).endsWith("/version") ? { "X-TNLAStation-Version": "1.2.3" } : {}),
        },
      });
    });
    const client = new EpgStationApiClient({ baseUrl: "/api", fetcher });

    await client.getConfig();
    await expect(client.getVersion()).resolves.toEqual({
      backend: "tnlastation",
      backendVersion: "1.2.3",
      version: "3.0.0",
    });

    expect(requested).toEqual(["/api/config", "/api/version"]);
  });

  it("identifies an unknown compatible backend when the TNLAStation version header is absent", async () => {
    const fetcher = vi.fn(async () => new Response(
      JSON.stringify({ version: "2.10.0" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    const client = new EpgStationApiClient({ baseUrl: "/api", fetcher });

    await expect(client.getVersion()).resolves.toEqual({
      backend: "other",
      backendVersion: "2.10.0",
      version: "2.10.0",
    });
  });

  it("requests reserves with the reference API query shape", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({ reserves: [], total: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const client = new EpgStationApiClient({ baseUrl: "/api/", fetcher });

    await client.getReserves({
      type: "conflict",
      isHalfWidth: false,
      ruleId: 0,
      channelId: 3273601024,
      genre: 7,
      keyword: "朝 ドラマ",
      offset: 0,
      limit: 24,
    });

    expect(fetcher).toHaveBeenCalledWith(
      "/api/reserves?type=conflict&isHalfWidth=false&ruleId=0&channelId=3273601024&genre=7&keyword=%E6%9C%9D+%E3%83%89%E3%83%A9%E3%83%9E&offset=0&limit=24",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
  });

  it("encodes recorded search keywords", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({ records: [], total: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const client = new EpgStationApiClient({ baseUrl: "/api", fetcher });

    await client.getRecorded({
      isHalfWidth: true,
      ruleId: 12,
      channelId: 3273601024,
      genre: 7,
      keyword: "朝 ドラマ",
    });

    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "/api/recorded?isHalfWidth=true&ruleId=12&channelId=3273601024&genre=7&keyword=%E6%9C%9D+%E3%83%89%E3%83%A9%E3%83%9E",
    );
  });

  it("posts the reference schedule search contract", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify(scheduleSearchFixture), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const client = new EpgStationApiClient({ baseUrl: "/api", fetcher });
    const request = {
      option: { keyword: "ニュース", name: true, description: true, extended: true, GR: true },
      isHalfWidth: true,
      limit: 100,
    };

    await expect(client.searchSchedules(request)).resolves.toEqual(scheduleSearchFixture);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/schedules/search",
      expect.objectContaining({ method: "POST", body: JSON.stringify(request) }),
    );
  });

  it("reads recording, rules, channels, streams and storages from existing paths", async () => {
    const responses: Record<string, unknown> = {
      "/api/recording?isHalfWidth=false&offset=0&limit=12": recordingFixture,
      "/api/rules?offset=0&limit=24&type=normal": rulesFixture,
      "/api/channels": channelsFixture,
      "/api/streams?isHalfWidth=true": streamsFixture,
      "/api/storages": storagesFixture,
    };
    const requested: string[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const endpoint = String(input);
      requested.push(endpoint);
      return new Response(JSON.stringify(responses[endpoint]), {
        status: endpoint in responses ? 200 : 404,
        headers: { "Content-Type": "application/json" },
      });
    });
    const client = new EpgStationApiClient({ baseUrl: "/api", fetcher });

    await expect(client.getRecording({ isHalfWidth: false, offset: 0, limit: 12 })).resolves.toEqual(recordingFixture);
    await expect(client.getRules({ offset: 0, limit: 24, type: "normal" })).resolves.toEqual(rulesFixture);
    await expect(client.getChannels()).resolves.toEqual(channelsFixture);
    await expect(client.getStreams(true)).resolves.toEqual(streamsFixture);
    await expect(client.getStorages()).resolves.toEqual(storagesFixture);
    expect(requested).toEqual(Object.keys(responses));
  });

  it("stops a running recording through its recorded id", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }));
    const client = new EpgStationApiClient({ baseUrl: "/api", fetcher });

    await client.stopRecording(202);

    expect(fetcher).toHaveBeenCalledWith(
      "/api/recorded/202",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("surfaces HTTP status and API detail", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({ message: "backend unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    });
    const client = new EpgStationApiClient({ baseUrl: "/api", fetcher });

    const request = client.getVersion();

    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({ status: 503, endpoint: "/api/version", detail: "backend unavailable" });
  });

  it("posts a time-specified manual reservation with the reference shape", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ reserveId: 701 }), { status: 201, headers: { "Content-Type": "application/json" } }));
    const client = new EpgStationApiClient({ baseUrl: "/api", fetcher });
    const option = {
      allowEndLack: true,
      timeSpecifiedOption: { name: "特別番組", channelId: 1, startAt: 1_753_000_000_000, endAt: 1_753_003_600_000 },
      saveOption: { parentDirectoryName: "recorded", directory: "special" },
    };

    await expect(client.addManualReserve(option)).resolves.toBe(701);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/reserves",
      expect.objectContaining({ method: "POST", body: JSON.stringify(option) }),
    );
  });

  it("gets, updates and deletes a reserve through the reserve endpoints", async () => {
    const requests: { endpoint: string; method: string; body?: BodyInit | null }[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const endpoint = String(input);
      requests.push({ endpoint, method: init?.method ?? "GET", body: init?.body });
      if (endpoint.includes("isHalfWidth")) {
        return new Response(JSON.stringify({ id: 701, name: "予約" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(null, { status: 200 });
    });
    const client = new EpgStationApiClient({ baseUrl: "/api", fetcher });

    await client.getReserve(701, false);
    await client.updateReserve(701, { allowEndLack: false });
    await client.deleteReserve(701);

    expect(requests.map(({ endpoint, method }) => `${method} ${endpoint}`)).toEqual([
      "GET /api/reserves/701?isHalfWidth=false",
      "PUT /api/reserves/701",
      "DELETE /api/reserves/701",
    ]);
    expect(JSON.parse(String(requests[1]?.body))).toEqual({ allowEndLack: false });
  });

  it("uses the TNLAStation error label and includes backend detail", async () => {
    const client = new EpgStationApiClient({
      baseUrl: "/api",
      fetcher: async () => new Response(JSON.stringify({ message: "AddRuleError" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    });

    await expect(client.getConfig()).rejects.toThrow("TNLAStation API returned 500: AddRuleError");
  });

  it("supports recorded detail, protection, deletion and multipart upload", async () => {
    const requests: { endpoint: string; method: string; body?: BodyInit | null }[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const endpoint = String(input);
      requests.push({ endpoint, method: init?.method ?? "GET", body: init?.body });
      if (endpoint.includes("isHalfWidth")) return new Response(JSON.stringify(recordedDetailFixture), { status: 200 });
      if (endpoint === "/api/recorded" && init?.method === "POST") return new Response(JSON.stringify({ recordedId: 702 }), { status: 200 });
      return new Response(null, { status: 204 });
    });
    const client = new EpgStationApiClient({ baseUrl: "/api", fetcher });

    await expect(client.getRecordedDetail(202, true)).resolves.toEqual(recordedDetailFixture);
    await client.protectRecorded(202);
    await client.unprotectRecorded(202);
    await client.stopRecordedEncode(202);
    await expect(client.createRecorded({ channelId: 1, startAt: 1, endAt: 2, name: "import" })).resolves.toBe(702);
    await client.uploadVideo({
      recordedId: 702,
      parentDirectoryName: "recorded",
      subDirectory: "imports",
      viewName: "sample.ts",
      fileType: "ts",
      file: new File(["video"], "sample.ts", { type: "video/mp2t" }),
    });
    await client.deleteRecorded(202);
    await client.deleteVideo(303);

    expect(requests.map(({ endpoint, method }) => `${method} ${endpoint}`)).toEqual([
      "GET /api/recorded/202?isHalfWidth=true",
      "PUT /api/recorded/202/protect",
      "PUT /api/recorded/202/unprotect",
      "DELETE /api/recorded/202/encode",
      "POST /api/recorded",
      "POST /api/videos/upload",
      "DELETE /api/recorded/202",
      "DELETE /api/videos/303",
    ]);
    const uploadBody = requests[5]?.body;
    expect(uploadBody).toBeInstanceOf(FormData);
    expect((uploadBody as FormData).get("recordedId")).toBe("702");
    expect((uploadBody as FormData).get("fileType")).toBe("ts");
  });

  it("supports rule, encode and stream operations through existing endpoints", async () => {
    const requested: { endpoint: string; method: string; body?: BodyInit | null }[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const endpoint = String(input);
      requested.push({ endpoint, method: init?.method ?? "GET", body: init?.body });
      if (endpoint === "/api/rules/301" && init?.method === "GET") return new Response(JSON.stringify(rulesFixture.rules[0]), { status: 200 });
      if (endpoint === "/api/rules" && init?.method === "POST") return new Response(JSON.stringify({ ruleId: 703 }), { status: 201 });
      if (endpoint === "/api/encode?isHalfWidth=false") return new Response(JSON.stringify(encodeFixture), { status: 200 });
      if (endpoint === "/api/encode" && init?.method === "POST") return new Response(JSON.stringify({ encodeId: 704 }), { status: 200 });
      if (endpoint.includes("/hls")) return new Response(JSON.stringify({ streamId: 705 }), { status: 200 });
      return new Response(null, { status: 204 });
    });
    const client = new EpgStationApiClient({ baseUrl: "/api", fetcher });

    await expect(client.addRule({
      isTimeSpecification: false,
      searchOption: { keyword: "news", name: true, GR: true },
      reserveOption: { enable: true, allowEndLack: true, avoidDuplicate: false },
    })).resolves.toBe(703);
    await expect(client.getRule(301)).resolves.toEqual(rulesFixture.rules[0]);
    const update = {
      name: "夜のニュース",
      isTimeSpecification: false,
      searchOption: { keyword: "news", name: true, GR: true },
      reserveOption: { enable: false, allowEndLack: true, avoidDuplicate: true, priority: 1 },
      saveOption: { parentDirectoryName: "recorded", directory: "news" },
    };
    await client.updateRule(301, update);
    await client.disableRule(703);
    await client.enableRule(703);
    await client.deleteRule(703);
    await expect(client.getEncode(false)).resolves.toEqual(encodeFixture);
    await expect(client.addEncode({ recordedId: 202, sourceVideoFileId: 501, mode: "H.264", removeOriginal: false })).resolves.toBe(704);
    await client.cancelEncode(704);
    await expect(client.startLiveHls(1, 0)).resolves.toBe(705);
    await expect(client.startRecordedHls(501, 30, 1)).resolves.toBe(705);
    await client.keepStream(705);
    await client.stopStream(705);

    expect(requested.map(({ endpoint, method }) => `${method} ${endpoint}`)).toContain("GET /api/rules/301");
    const updateRequest = requested.find(({ endpoint, method }) => endpoint === "/api/rules/301" && method === "PUT");
    expect(updateRequest?.body).toBe(JSON.stringify(update));
    expect(requested.map(({ endpoint, method }) => `${method} ${endpoint}`)).toContain("PUT /api/rules/703/disable");
    expect(requested.map(({ endpoint, method }) => `${method} ${endpoint}`)).toContain("DELETE /api/encode/704");
    expect(requested.map(({ endpoint, method }) => `${method} ${endpoint}`)).toContain("GET /api/streams/recorded/501/hls?ss=30&mode=1");
    expect(requested.map(({ endpoint, method }) => `${method} ${endpoint}`)).toContain("PUT /api/streams/705/keep");
  });

  it("takes the LL-HLS playlist location from the server instead of deriving it", async () => {
    const requested: string[] = [];
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      requested.push(String(input));
      return new Response(
        JSON.stringify({ streamId: 706, playlistUrl: "/lowlatency/live/706/index.m3u8" }),
        { status: 200 },
      );
    });
    const client = new EpgStationApiClient({ baseUrl: "/api", fetcher });

    await expect(client.startLiveLowLatency(1, 2)).resolves.toEqual({
      streamId: 706,
      playlistUrl: "/lowlatency/live/706/index.m3u8",
    });
    expect(requested).toContain("/api/streams/live/1/lowlatency?mode=2");
  });

  it("builds direct video, stream and HLS playlist URLs under the configured base", () => {
    const client = new EpgStationApiClient({ baseUrl: "/epg/api", fetcher: vi.fn() });

    expect(client.videoUrl(501, true)).toBe("/epg/api/videos/501?isDownload=true");
    expect(client.liveStreamUrl(1, "m2tsll", 2)).toBe("/epg/api/streams/live/1/m2tsll?mode=2");
    expect(client.recordedStreamUrl(501, "webm", 1, 30)).toBe("/epg/api/streams/recorded/501/webm?mode=1&ss=30");
    expect(client.streamPlaylistUrl(705)).toBe("/epg/streamfiles/stream705.m3u8");
  });
});
