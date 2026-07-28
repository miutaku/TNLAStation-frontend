import type { ChannelItem, EncodeInfo, RecordedItem, Records, Rules, ScheduleProgramItem, StorageInfo, StreamInfo } from "./types";

export const scheduleSearchFixture = [
  {
    id: 101,
    channelId: 1,
    startAt: Date.UTC(2026, 6, 20, 10, 0),
    endAt: Date.UTC(2026, 6, 20, 11, 0),
    isFree: true,
    name: "夜のニュース",
    description: "今日の出来事を振り返ります。",
    genre1: 0,
  },
] satisfies ScheduleProgramItem[];

export const recordingFixture = {
  records: [
    {
      id: 201,
      channelId: 1,
      startAt: Date.UTC(2026, 6, 20, 10, 0),
      endAt: Date.UTC(2026, 6, 20, 11, 0),
      name: "録画中の番組",
      isRecording: true,
      isEncoding: false,
      isProtected: false,
    },
  ],
  total: 1,
} satisfies Records;

export const recordedDetailFixture = {
  id: 202,
  channelId: 1,
  startAt: Date.UTC(2026, 6, 20, 9, 0),
  endAt: Date.UTC(2026, 6, 20, 10, 0),
  name: "録画済みの番組",
  description: "録画詳細のサンプルです。",
  isRecording: false,
  isEncoding: true,
  isProtected: true,
  videoFiles: [
    {
      id: 501,
      name: "録画済みの番組.ts",
      filename: "recorded/sample.ts",
      type: "ts",
      size: 1024 ** 3,
    },
  ],
} satisfies RecordedItem;

export const encodeFixture = {
  runningItems: [
    {
      id: 601,
      mode: "H.264",
      recorded: recordedDetailFixture,
      percent: 42.5,
      log: "encoding",
    },
  ],
  waitItems: [],
} satisfies EncodeInfo;

export const rulesFixture = {
  rules: [
    {
      id: 301,
      isTimeSpecification: false,
      searchOption: {
        keyword: "ニュース",
        name: true,
        description: true,
        extended: true,
        GR: true,
      },
      reserveOption: {
        enable: true,
        allowEndLack: true,
        avoidDuplicate: false,
      },
      reservesCnt: 2,
    },
  ],
  total: 1,
} satisfies Rules;

export const channelsFixture = [
  {
    id: 1,
    serviceId: 101,
    networkId: 32736,
    name: "サンプル放送",
    halfWidthName: "サンプル放送",
    remoteControlKeyId: 1,
    hasLogoData: false,
    channelType: "GR",
    channel: "27",
    type: 0x01,
  },
] satisfies ChannelItem[];

export const streamsFixture = {
  items: [
    {
      streamId: 401,
      type: "LiveHLS",
      mode: 0,
      isEnable: true,
      channelId: 1,
      name: "放送中のニュース",
      startAt: Date.UTC(2026, 6, 20, 10, 0),
      endAt: Date.UTC(2026, 6, 20, 11, 0),
      description: "ライブストリームのサンプルです。",
    },
  ],
} satisfies StreamInfo;

export const storagesFixture = {
  items: [
    {
      name: "recorded",
      available: 250 * 1024 ** 3,
      used: 750 * 1024 ** 3,
      total: 1000 * 1024 ** 3,
      fileTypes: [
        { category: "video", format: "mpeg-ts", count: 20, size: 400 * 1024 ** 3 },
        { category: "video", format: "mp4", count: 12, size: 120 * 1024 ** 3 },
        { category: "log", format: "drop-log", count: 20, size: 2 * 1024 ** 2 },
        { category: "other", format: "other", count: 3, size: (230 * 1024 ** 3) - (2 * 1024 ** 2) },
      ],
    },
  ],
} satisfies StorageInfo;
