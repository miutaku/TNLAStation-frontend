import type {
  ChannelItem,
  Config,
  EncodeInfo,
  RecordedItem,
  Records,
  ReserveItem,
  Reserves,
  Rule,
  Rules,
  Schedule,
  ScheduleProgramItem,
  StorageInfo,
  StreamInfo,
} from "./types";

const HOUR = 60 * 60_000;
const MINUTE = 60_000;

const channels = [
  { id: 1, serviceId: 101, networkId: 32736, name: "TNLA 総合", halfWidthName: "TNLA 総合", remoteControlKeyId: 1, hasLogoData: true, channelType: "GR", channel: "27", type: 1 },
  { id: 2, serviceId: 102, networkId: 32736, name: "TNLA 教育", halfWidthName: "TNLA 教育", remoteControlKeyId: 2, hasLogoData: true, channelType: "GR", channel: "27", type: 1 },
  { id: 3, serviceId: 141, networkId: 4, name: "TNLA BS", halfWidthName: "TNLA BS", remoteControlKeyId: 4, hasLogoData: true, channelType: "BS", channel: "BS15_0", type: 1 },
  { id: 4, serviceId: 333, networkId: 6, name: "TNLA シネマ", halfWidthName: "TNLA シネマ", remoteControlKeyId: 10, hasLogoData: true, channelType: "BS", channel: "BS21_0", type: 1 },
] satisfies ChannelItem[];

const config = {
  socketIOPort: 0,
  broadcast: { GR: true, BS: true, CS: false, SKY: false },
  recorded: ["recorded"],
  encode: ["encoded"],
  urlscheme: { m2ts: {}, video: {}, download: {} },
  isEnableTSLiveStream: true,
  isEnableTSRecordedStream: true,
  isEnableEncodedRecordedStream: true,
  streamConfig: {
    live: { ts: { hls: ["720p", "480p"], lowlatency: ["720p"] } },
    recorded: { ts: { hls: ["720p", "480p"], mp4: ["720p"] }, encoded: { hls: ["720p"] } },
  },
} satisfies Config;

function anchor(now: number): number {
  return Math.floor(now / HOUR) * HOUR;
}

function program(id: number, channelId: number, startAt: number, name: string, genre1: number): ScheduleProgramItem {
  return {
    id,
    channelId,
    startAt,
    endAt: startAt + HOUR,
    isFree: true,
    name,
    description: `${name}のデモ番組情報です。実際の放送・録画データは使用していません。`,
    genre1,
    videoType: "h.264",
    videoResolution: "1080p",
    audioSamplingRate: 48000,
  };
}

function schedulesFor(now: number): Schedule[] {
  const start = anchor(now) - HOUR;
  const names = [
    ["モーニングニュース", "くらしの時間", "列島リポート", "イブニングニュース"],
    ["サイエンスラボ", "こどもアトリエ", "語学講座", "クラシックアワー"],
    ["世界紀行", "スポーツライブ", "ドキュメンタリー", "宇宙への旅"],
    ["名作シネマ", "映画ナビ", "ドラマセレクション", "深夜劇場"],
  ];

  return channels.map((channel, channelIndex) => ({
    channel,
    programs: names[channelIndex].map((name, programIndex) =>
      program(1000 + channel.id * 10 + programIndex, channel.id, start + programIndex * HOUR, name, channelIndex),
    ),
  }));
}

function reserveItems(now: number): ReserveItem[] {
  const startAt = anchor(now) + 2 * HOUR;
  return [
    {
      id: 701,
      ruleId: 301,
      ruleName: "ニュース",
      isSkip: false,
      isConflict: false,
      isOverlap: false,
      allowEndLack: true,
      isTimeSpecified: false,
      isDeleteOriginalAfterEncode: false,
      programId: 1012,
      channelId: 1,
      startAt,
      endAt: startAt + HOUR,
      name: "イブニングニュース",
      description: "国内外のニュースを分かりやすくお伝えします。",
      genre1: 0,
      videoType: "h.264",
      videoResolution: "1080p",
      audioSamplingRate: 48000,
    },
    {
      id: 702,
      isSkip: false,
      isConflict: false,
      isOverlap: false,
      allowEndLack: true,
      isTimeSpecified: true,
      isDeleteOriginalAfterEncode: false,
      channelId: 4,
      startAt: startAt + HOUR,
      endAt: startAt + 3 * HOUR,
      name: "週末ロードショー",
      description: "デモ用の時刻指定予約です。",
      genre1: 6,
    },
  ];
}

function recordedItems(now: number): RecordedItem[] {
  const endAt = anchor(now) - HOUR;
  return [
    {
      id: 202,
      ruleId: 301,
      programId: 9901,
      channelId: 1,
      startAt: endAt - HOUR,
      endAt,
      name: "朝のニュースダイジェスト",
      description: "主要ニュースと天気予報をまとめたデモ録画です。",
      genre1: 0,
      videoType: "h.264",
      videoResolution: "1080p",
      audioSamplingRate: 48000,
      isRecording: false,
      thumbnails: [801],
      videoFiles: [{ id: 501, name: "朝のニュースダイジェスト.ts", filename: "recorded/demo.ts", type: "ts", size: 3_221_225_472 }],
      tags: [{ id: 901, name: "お気に入り", color: "#e6365f" }],
      isEncoding: false,
      isProtected: true,
    },
    {
      id: 203,
      channelId: 3,
      startAt: endAt - 25 * HOUR,
      endAt: endAt - 24 * HOUR,
      name: "世界紀行・北欧編",
      description: "北欧の街と自然を訪ねます。",
      genre1: 8,
      isRecording: false,
      thumbnails: [802],
      videoFiles: [{ id: 502, name: "世界紀行.mp4", filename: "encoded/travel.mp4", type: "encoded", size: 1_288_490_188 }],
      isEncoding: false,
      isProtected: false,
    },
  ];
}

function recordingItems(now: number): RecordedItem[] {
  const startAt = anchor(now) - 30 * MINUTE;
  return [{
    id: 201,
    programId: 1001,
    channelId: 2,
    startAt,
    endAt: startAt + HOUR,
    name: "サイエンスラボ",
    description: "身近な科学を実験で紹介します。",
    genre1: 3,
    isRecording: true,
    isEncoding: false,
    isProtected: false,
  }];
}

const rule = {
  id: 301,
  name: "ニュース",
  isTimeSpecification: false,
  searchOption: { keyword: "ニュース", name: true, description: true, GR: true, BS: true },
  reserveOption: { enable: true, allowEndLack: true, avoidDuplicate: true, periodToAvoidDuplicate: 168 },
  reservesCnt: 1,
} satisfies Rule;

function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return Response.json(body, { ...init, headers });
}

function empty(status = 204): Response {
  return new Response(null, { status, headers: { "cache-control": "no-store" } });
}


function demoApi(method: string, url: URL): Response {
  const path = url.pathname;
  const now = Date.now();
  const schedules = schedulesFor(now);
  const recorded = recordedItems(now);
  const recording = recordingItems(now);
  const reserves = reserveItems(now);


  if (method === "GET" && path === "/api/config") return json(config);
  if (method === "GET" && path === "/api/version") {
    return json({ version: "2.10.0-demo" }, { headers: { "X-TNLAStation-Version": "demo" } });
  }
  if (method === "GET" && path === "/api/channels") return json(channels);
  if (method === "GET" && path === "/api/schedules") return json(schedules);
  if (method === "GET" && path === "/api/schedules/broadcasting") return json(schedules);
  if (method === "POST" && path === "/api/schedules/search") {
    return json(schedules.flatMap((schedule) => schedule.programs).filter((item) => item.name.includes("ニュース")));
  }

  if (method === "GET" && path === "/api/reserves") return json({ reserves, total: reserves.length } satisfies Reserves);
  if (method === "POST" && path === "/api/reserves") return json({ reserveId: 701 }, { status: 201 });
  if (method === "GET" && /^\/api\/reserves\/(701|702)$/.test(path)) {
    return json(reserves.find((item) => path.endsWith(String(item.id))) ?? reserves[0]);
  }

  if (method === "GET" && path === "/api/recorded") return json({ records: recorded, total: recorded.length } satisfies Records);
  if (method === "POST" && path === "/api/recorded") return json({ recordedId: 202 }, { status: 201 });
  if (method === "POST" && path === "/api/recorded/cleanup") return json({ removed: 0 });
  if (method === "GET" && /^\/api\/recorded\/(202|203)$/.test(path)) {
    return json(recorded.find((item) => path.endsWith(String(item.id))) ?? recorded[0]);
  }
  if (method === "GET" && path === "/api/recording") return json({ records: recording, total: recording.length } satisfies Records);

  if (method === "GET" && path === "/api/rules") return json({ rules: [rule], total: 1 } satisfies Rules);
  if (method === "POST" && path === "/api/rules") return json({ ruleId: 301 }, { status: 201 });
  if (method === "GET" && path === "/api/rules/301") return json(rule);

  if (method === "GET" && path === "/api/encode") {
    const queue = { runningItems: [{ id: 601, mode: "H.264 720p", recorded: recorded[1], percent: 68.4, log: "デモエンコードを実行中" }], waitItems: [] } satisfies EncodeInfo;
    return json(queue);
  }
  if (method === "POST" && path === "/api/encode") return json({ encodeId: 601 }, { status: 201 });

  if (method === "GET" && path === "/api/streams") {
    const item = schedules[0].programs[1];
    return json({ items: [{ streamId: 401, type: "LiveHLS", mode: 0, isEnable: true, channelId: 1, name: item.name, startAt: item.startAt, endAt: item.endAt, description: item.description, client: "デモブラウザー" }] } satisfies StreamInfo);
  }
  if (method === "GET" && /^\/api\/streams\/(live|recorded)\/\d+\/(hls|lowlatency)$/.test(path)) {
    return path.endsWith("/lowlatency")
      ? json({ streamId: 401, playlistUrl: "/streamfiles/demo.m3u8" })
      : json({ streamId: 401 });
  }

  if (method === "GET" && path === "/api/tags") return json({ tags: [{ id: 901, name: "お気に入り", color: "#e6365f" }], total: 1 });
  if (method === "POST" && path === "/api/tags") return json({ tagId: 901 }, { status: 201 });
  if (method === "GET" && path === "/api/storages") {
    const storage = { items: [{ name: "demo-storage", available: 250 * 1024 ** 3, used: 750 * 1024 ** 3, total: 1000 * 1024 ** 3, fileTypes: [{ category: "video", format: "mpeg-ts", count: 128, size: 620 * 1024 ** 3 }, { category: "video", format: "mp4", count: 42, size: 120 * 1024 ** 3 }, { category: "other", format: "other", count: 8, size: 10 * 1024 ** 3 }] }] } satisfies StorageInfo;
    return json(storage);
  }

  if (method !== "GET") return empty();
  return json({ message: "この操作は公開デモでは利用できません。" }, { status: 404 });
}


export function demoFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(rawUrl, "https://tnlastation-demo.invalid");
  const requestMethod = typeof Request !== "undefined" && input instanceof Request ? input.method : "GET";
  const method = (init?.method ?? requestMethod).toUpperCase();
  return Promise.resolve(demoApi(method, url));
}
