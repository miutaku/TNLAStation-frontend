/** EPGStation's public API types, derived from the reference api.d.ts/api.yml. */
export type UnixTimeMs = number;
export type ChannelId = number;
export type ProgramId = number;
export type RuleId = number;
export type ReserveId = number;
export type RecordedId = number;
export type VideoFileId = number;
export type ThumbnailId = number;
export type RecordedTagId = number;
export type StreamId = number;
export type EncodeId = number;
export type ChannelType = "GR" | "BS" | "CS" | "SKY";
export type StreamType = "LiveStream" | "LiveHLS" | "RecordedStream" | "RecordedHLS";
export type VideoFileType = "ts" | "encoded";
export type ProgramVideoType = "mpeg2" | "h.264" | "h.265";
export type ProgramVideoResolution = "240p" | "480i" | "480p" | "720p" | "1080i" | "1080p" | "2160p" | "4320p";
export type ProgramAudioSamplingRate = 16000 | 22050 | 24000 | 32000 | 44100 | 48000;
export type RawExtended = Record<string, string>;

export interface BroadcastStatus {
  GR: boolean;
  BS: boolean;
  CS: boolean;
  SKY: boolean;
}

export interface ChannelItem {
  id: ChannelId;
  serviceId: number;
  networkId: number;
  name: string;
  halfWidthName: string;
  remoteControlKeyId?: number;
  hasLogoData: boolean;
  channelType: ChannelType;
  channel: string;
  type?: number;
}

export interface UrlSchemeInfo {
  ios?: string;
  android?: string;
  mac?: string;
  win?: string;
}

export interface M2tsStreamParam {
  name: string;
  isUnconverted: boolean;
}

export interface Config {
  socketIOPort: number;
  broadcast: BroadcastStatus;
  recorded: string[];
  encode: string[];
  urlscheme: {
    m2ts: UrlSchemeInfo;
    video: UrlSchemeInfo;
    download: UrlSchemeInfo;
  };
  isEnableTSLiveStream: boolean;
  isEnableTSRecordedStream: boolean;
  isEnableEncodedRecordedStream: boolean;
  streamConfig?: {
    live?: {
      ts?: {
        m2ts?: M2tsStreamParam[];
        m2tsll?: string[];
        webm?: string[];
        mp4?: string[];
        hls?: string[];
        /** EPGStation に無い TNLAStation の追加 (docs/compatibility.md)。 */
        lowlatency?: string[];
      };
    };
    recorded?: {
      ts?: { webm?: string[]; mp4?: string[]; hls?: string[] };
      encoded?: { webm?: string[]; mp4?: string[]; hls?: string[] };
    };
  };
  kodiHosts?: string[];
}

export type GetReserveType = "all" | "normal" | "conflict" | "skip" | "overlap";

export interface GetReserveOptions {
  type?: GetReserveType;
  isHalfWidth: boolean;
  ruleId?: RuleId;
  channelId?: ChannelId;
  genre?: number;
  keyword?: string;
  offset?: number;
  limit?: number;
}

export interface Reserves {
  reserves: ReserveItem[];
  total: number;
}

export interface ReserveItem {
  id: ReserveId;
  ruleId?: RuleId;
  isSkip: boolean;
  isConflict: boolean;
  isOverlap: boolean;
  allowEndLack: boolean;
  isTimeSpecified: boolean;
  tags?: RecordedTagId[];
  parentDirectoryName?: string;
  directory?: string;
  recordedFormat?: string;
  encodeMode1?: string;
  encodeParentDirectoryName1?: string;
  encodeDirectory1?: string;
  encodeMode2?: string;
  encodeParentDirectoryName2?: string;
  encodeDirectory2?: string;
  encodeMode3?: string;
  encodeParentDirectoryName3?: string;
  encodeDirectory3?: string;
  isDeleteOriginalAfterEncode: boolean;
  programId?: ProgramId;
  channelId: ChannelId;
  startAt: UnixTimeMs;
  endAt: UnixTimeMs;
  name: string;
  description?: string;
  extended?: string;
  rawExtended?: RawExtended;
  genre1?: number;
  subGenre1?: number;
  genre2?: number;
  subGenre2?: number;
  genre3?: number;
  subGenre3?: number;
  videoType?: ProgramVideoType;
  videoResolution?: ProgramVideoResolution;
  videoStreamContent?: number;
  videoComponentType?: number;
  audioSamplingRate?: ProgramAudioSamplingRate;
  audioComponentType?: number;
}

export interface Genre {
  genre: number;
  subGenre?: number;
}

export interface SearchTime {
  start?: number;
  range?: number;
  week: number;
}

export interface SearchPeriod {
  startAt: UnixTimeMs;
  endAt: UnixTimeMs;
}

export interface RuleSearchOptions {
  keyword?: string;
  ignoreKeyword?: string;
  keyCS?: boolean;
  keyRegExp?: boolean;
  name?: boolean;
  description?: boolean;
  extended?: boolean;
  ignoreKeyCS?: boolean;
  ignoreKeyRegExp?: boolean;
  ignoreName?: boolean;
  ignoreDescription?: boolean;
  ignoreExtended?: boolean;
  GR?: boolean;
  BS?: boolean;
  CS?: boolean;
  SKY?: boolean;
  channelIds?: ChannelId[];
  genres?: Genre[];
  times?: SearchTime[];
  isFree?: boolean;
  durationMin?: number;
  durationMax?: number;
  searchPeriods?: SearchPeriod[];
}

export interface RuleReserveOptions {
  enable: boolean;
  allowEndLack: boolean;
  avoidDuplicate: boolean;
  periodToAvoidDuplicate?: number;
  tags?: RecordedTagId[];
}

export interface ReserveSaveOptions {
  parentDirectoryName?: string;
  directory?: string;
  recordedFormat?: string;
}

export interface ReserveEncodeOptions {
  mode1?: string;
  encodeParentDirectoryName1?: string;
  directory1?: string;
  mode2?: string;
  encodeParentDirectoryName2?: string;
  directory2?: string;
  mode3?: string;
  encodeParentDirectoryName3?: string;
  directory3?: string;
  isDeleteOriginalAfterEncode: boolean;
}

export interface EditManualReserveOption {
  allowEndLack: boolean;
  tags?: RecordedTagId[];
  saveOption?: ReserveSaveOptions;
  encodeOption?: ReserveEncodeOptions;
}

export interface ManualReserveOption extends EditManualReserveOption {
  programId?: ProgramId;
  timeSpecifiedOption?: {
    name: string;
    channelId: ChannelId;
    startAt: UnixTimeMs;
    endAt: UnixTimeMs;
  };
}

export interface Rule {
  id: RuleId;
  /** ルールの表示名 (TNLAStation 独自)。未設定なら undefined。 */
  name?: string;
  isTimeSpecification: boolean;
  searchOption: RuleSearchOptions;
  reserveOption: RuleReserveOptions;
  saveOption?: ReserveSaveOptions;
  encodeOption?: ReserveEncodeOptions;
  reservesCnt?: number;
}

export interface RuleMutationOptions {
  /** ルールの表示名 (任意)。未指定なら UI 側で「無題のルール」と表示する。 */
  name?: string;
  isTimeSpecification: boolean;
  searchOption: RuleSearchOptions;
  reserveOption: RuleReserveOptions;
  saveOption?: ReserveSaveOptions;
  encodeOption?: ReserveEncodeOptions;
}

export type AddRuleOptions = RuleMutationOptions;
export type UpdateRuleOptions = RuleMutationOptions;

export interface Rules {
  rules: Rule[];
  total: number;
}

export interface GetRuleOptions {
  offset?: number;
  limit?: number;
  type?: GetReserveType;
  keyword?: string;
}

export interface GetRecordedOptions {
  isHalfWidth: boolean;
  offset?: number;
  limit?: number;
  isReverse?: boolean;
  ruleId?: RuleId;
  channelId?: ChannelId;
  genre?: number;
  keyword?: string;
  hasOriginalFile?: boolean;
}

export interface Records {
  records: RecordedItem[];
  total: number;
}

export interface VideoFile {
  id: VideoFileId;
  name: string;
  filename: string;
  type: VideoFileType;
  size: number;
}

export interface DropLogFile {
  id: number;
  errorCnt: number;
  dropCnt: number;
  scramblingCnt: number;
}

export interface RecordedTags {
  tags: RecordedTag[];
  total: number;
}

export interface RecordedTag {
  id: RecordedTagId;
  name: string;
  color: string;
}

export interface RecordedItem {
  id: RecordedId;
  ruleId?: RuleId;
  programId?: ProgramId;
  channelId: ChannelId;
  startAt: UnixTimeMs;
  endAt: UnixTimeMs;
  name: string;
  description?: string;
  extended?: string;
  rawExtended?: RawExtended;
  genre1?: number;
  subGenre1?: number;
  genre2?: number;
  subGenre2?: number;
  genre3?: number;
  subGenre3?: number;
  videoType?: ProgramVideoType;
  videoResolution?: ProgramVideoResolution;
  videoStreamContent?: number;
  videoComponentType?: number;
  audioSamplingRate?: ProgramAudioSamplingRate;
  audioComponentType?: number;
  isRecording: boolean;
  thumbnails?: ThumbnailId[];
  videoFiles?: VideoFile[];
  dropLogFile?: DropLogFile;
  tags?: RecordedTag[];
  isEncoding: boolean;
  isProtected: boolean;
}

export interface CreateNewRecordedOptions {
  ruleId?: RuleId;
  channelId: ChannelId;
  startAt: UnixTimeMs;
  endAt: UnixTimeMs;
  name: string;
  description?: string;
  extended?: string;
  genre1?: number;
  subGenre1?: number;
  genre2?: number;
  subGenre2?: number;
  genre3?: number;
  subGenre3?: number;
}

export interface UploadVideoFileOptions {
  recordedId: RecordedId;
  parentDirectoryName: string;
  subDirectory?: string;
  viewName: string;
  fileType: VideoFileType;
  file: File;
}

export interface EncodeInfo {
  runningItems: EncodeProgramItem[];
  waitItems: EncodeProgramItem[];
}

export interface EncodeProgramItem {
  id: EncodeId;
  mode: string;
  recorded: RecordedItem;
  percent?: number;
  log?: string;
}

export interface AddManualEncodeProgramOptions {
  recordedId: RecordedId;
  sourceVideoFileId: VideoFileId;
  parentDir?: string;
  directory?: string;
  isSaveSameDirectory?: boolean;
  mode: string;
  removeOriginal: boolean;
}

export interface VersionInfo {
  backend: "other" | "tnlastation";
  backendVersion: string;
  /** EPGStation 互換APIとして返されるバージョン。 */
  version: string;
}

export interface ScheduleOptions {
  startAt: UnixTimeMs;
  endAt: UnixTimeMs;
  isHalfWidth: boolean;
  needsRawExtended?: boolean;
  isFree?: boolean;
  GR: boolean;
  BS: boolean;
  CS: boolean;
  SKY: boolean;
}

export interface ScheduleChannelItem {
  id: ChannelId;
  serviceId: number;
  networkId: number;
  name: string;
  remoteControlKeyId?: number;
  hasLogoData: boolean;
  channelType: ChannelType;
  type?: number;
}

export interface ScheduleProgramItem {
  id: ProgramId;
  channelId: ChannelId;
  startAt: UnixTimeMs;
  endAt: UnixTimeMs;
  isFree: boolean;
  name: string;
  description?: string;
  extended?: string;
  rawExtended?: RawExtended;
  genre1?: number;
  subGenre1?: number;
  genre2?: number;
  subGenre2?: number;
  genre3?: number;
  subGenre3?: number;
  videoType?: ProgramVideoType;
  videoResolution?: ProgramVideoResolution;
  videoStreamContent?: number;
  videoComponentType?: number;
  audioSamplingRate?: ProgramAudioSamplingRate;
  audioComponentType?: number;
}

export interface Schedule {
  channel: ScheduleChannelItem;
  programs: ScheduleProgramItem[];
}

export interface ScheduleSearchOptions {
  option: RuleSearchOptions;
  isHalfWidth: boolean;
  limit?: number;
}

export interface LiveStreamInfoItem {
  streamId: StreamId;
  type: StreamType;
  mode: number;
  isEnable: boolean;
  channelId: ChannelId;
  name: string;
  startAt: UnixTimeMs;
  endAt: UnixTimeMs;
  description?: string;
  extended?: string;
  rawExtended?: RawExtended;
  /** 接続元。EPGStation に無い TNLAStation の追加 (docs/compatibility.md)。 */
  client?: string;
}

export interface VideoFileStreamInfoItem extends LiveStreamInfoItem {
  viodeFileId: VideoFileId;
  recordedId: RecordedId;
}

export interface StreamInfo {
  items: (LiveStreamInfoItem | VideoFileStreamInfoItem)[];
}

export interface StorageItem {
  name: string;
  available: number;
  used: number;
  total: number;
  fileTypes: StorageFileUsage[];
}

export type StorageFileCategory = "video" | "audio" | "image" | "subtitle" | "log" | "other";

export interface StorageFileUsage {
  category: StorageFileCategory;
  format: string;
  count: number;
  size: number;
}

export interface StorageInfo {
  items: StorageItem[];
}
