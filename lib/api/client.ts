import type {
  AddManualEncodeProgramOptions,
  AddRuleOptions,
  ChannelItem,
  Config,
  CreateNewRecordedOptions,
  EncodeId,
  EncodeInfo,
  GetRecordedOptions,
  GetRuleOptions,
  GetReserveOptions,
  ManualReserveOption,
  RecordedId,
  RecordedItem,
  RecordedTagId,
  RecordedTags,
  Records,
  ReserveId,
  Rule,
  RuleId,
  Reserves,
  Rules,
  Schedule,
  ScheduleOptions,
  ScheduleProgramItem,
  ScheduleSearchOptions,
  StorageInfo,
  ThumbnailId,
  StreamInfo,
  StreamId,
  UploadVideoFileOptions,
  UpdateRuleOptions,
  VideoFileId,
  VersionInfo,
} from "./types";

export type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type QueryValue = string | number | boolean | readonly (string | number | boolean)[] | null | undefined;
type Query = Record<string, QueryValue>;

export class ApiError extends Error {
  readonly status: number;
  readonly endpoint: string;
  readonly detail?: string;

  constructor(message: string, status: number, endpoint: string, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.endpoint = endpoint;
    this.detail = detail;
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.trim() || "/api";
  return normalized === "/" ? "" : normalized.replace(/\/+$/, "");
}

export function appendQuery(path: string, query?: Query): string {
  if (!query) return path;
  const searchParams = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined || rawValue === null || rawValue === "") continue;
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) searchParams.append(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString ? `${path}?${queryString}` : path;
}

async function readErrorDetail(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "string") return body;
    if (body && typeof body === "object" && "message" in body && typeof body.message === "string") return body.message;
  } catch {
    // A non-JSON error response is valid; the HTTP status still carries the failure.
  }
  return undefined;
}

export class EpgStationApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: Fetcher;

  constructor({
    baseUrl = process.env.NEXT_PUBLIC_TNLA_API_BASE ?? "/api",
    fetcher = globalThis.fetch.bind(globalThis),
  }: { baseUrl?: string; fetcher?: Fetcher } = {}) {
    this.baseUrl = normalizeBaseUrl(baseUrl);
    this.fetcher = fetcher;
  }

  private async request(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    { query, body, signal }: { query?: Query; body?: unknown; signal?: AbortSignal } = {},
  ): Promise<Response> {
    const endpoint = appendQuery(`${this.baseUrl}${path}`, query);
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const response = await this.fetcher(endpoint, {
      method,
      headers: {
        Accept: "application/json",
        ...(body === undefined || isFormData ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: isFormData ? body : JSON.stringify(body) }),
      cache: "no-store",
      signal,
    });

    if (!response.ok) {
      const detail = await readErrorDetail(response);
      throw new ApiError(`EPGStation API returned ${response.status}`, response.status, endpoint, detail);
    }

    return response;
  }

  private async get<T>(path: string, query?: Query, signal?: AbortSignal): Promise<T> {
    const response = await this.request("GET", path, { query, signal });
    return (await response.json()) as T;
  }

  private async post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    const response = await this.request("POST", path, { body, signal });
    return (await response.json()) as T;
  }

  private async requestVoid(
    method: "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<void> {
    await this.request(method, path, { body, signal });
  }

  getConfig(signal?: AbortSignal): Promise<Config> {
    return this.get<Config>("/config", undefined, signal);
  }

  getReserves(options: GetReserveOptions, signal?: AbortSignal): Promise<Reserves> {
    return this.get<Reserves>("/reserves", options as unknown as Query, signal);
  }

  async addManualReserve(options: ManualReserveOption, signal?: AbortSignal): Promise<ReserveId> {
    const result = await this.post<{ reserveId: ReserveId }>("/reserves", options, signal);
    return result.reserveId;
  }

  getRecorded(options: GetRecordedOptions, signal?: AbortSignal): Promise<Records> {
    return this.get<Records>("/recorded", options as unknown as Query, signal);
  }

  getRecordedDetail(recordedId: RecordedId, isHalfWidth: boolean, signal?: AbortSignal): Promise<RecordedItem> {
    return this.get<RecordedItem>(`/recorded/${recordedId}`, { isHalfWidth }, signal);
  }

  protectRecorded(recordedId: RecordedId, signal?: AbortSignal): Promise<void> {
    return this.requestVoid("PUT", `/recorded/${recordedId}/protect`, undefined, signal);
  }

  unprotectRecorded(recordedId: RecordedId, signal?: AbortSignal): Promise<void> {
    return this.requestVoid("PUT", `/recorded/${recordedId}/unprotect`, undefined, signal);
  }

  deleteRecorded(recordedId: RecordedId, signal?: AbortSignal): Promise<void> {
    return this.requestVoid("DELETE", `/recorded/${recordedId}`, undefined, signal);
  }

  /** ファイルが見つからない録画を DB から取り除く。削除できた件数を返す。 */
  async cleanupRecorded(signal?: AbortSignal): Promise<number> {
    const result = await this.post<{ removed: number }>("/recorded/cleanup", undefined, signal);
    return result.removed;
  }

  stopRecordedEncode(recordedId: RecordedId, signal?: AbortSignal): Promise<void> {
    return this.requestVoid("DELETE", `/recorded/${recordedId}/encode`, undefined, signal);
  }

  async createRecorded(options: CreateNewRecordedOptions, signal?: AbortSignal): Promise<RecordedId> {
    const result = await this.post<{ recordedId: RecordedId }>("/recorded", options, signal);
    return result.recordedId;
  }

  uploadVideo(options: UploadVideoFileOptions, signal?: AbortSignal): Promise<void> {
    const formData = new FormData();
    formData.append("recordedId", String(options.recordedId));
    formData.append("parentDirectoryName", options.parentDirectoryName);
    if (options.subDirectory) formData.append("subDirectory", options.subDirectory);
    formData.append("viewName", options.viewName);
    formData.append("fileType", options.fileType);
    formData.append("file", options.file);
    return this.requestVoid("POST", "/videos/upload", formData, signal);
  }

  getRecording(options: GetRecordedOptions, signal?: AbortSignal): Promise<Records> {
    return this.get<Records>("/recording", options as unknown as Query, signal);
  }

  // EPGStation に録画停止専用のエンドポイントは無く、録画中の項目を DELETE /recorded/{id}
  // すると予約ごと取り消される (EventSetter.setDeleteRecorded)。互換面に無いパスを叩かない。
  stopRecording(recordedId: RecordedId, signal?: AbortSignal): Promise<void> {
    return this.requestVoid("DELETE", `/recorded/${recordedId}`, undefined, signal);
  }

  getRules(options: GetRuleOptions, signal?: AbortSignal): Promise<Rules> {
    return this.get<Rules>("/rules", options as unknown as Query, signal);
  }

  getRule(ruleId: RuleId, signal?: AbortSignal): Promise<Rule> {
    return this.get<Rule>(`/rules/${ruleId}`, undefined, signal);
  }

  async addRule(options: AddRuleOptions, signal?: AbortSignal): Promise<RuleId> {
    const result = await this.post<{ ruleId: RuleId }>("/rules", options, signal);
    return result.ruleId;
  }

  updateRule(ruleId: RuleId, options: UpdateRuleOptions, signal?: AbortSignal): Promise<void> {
    return this.requestVoid("PUT", `/rules/${ruleId}`, options, signal);
  }

  enableRule(ruleId: RuleId, signal?: AbortSignal): Promise<void> {
    return this.requestVoid("PUT", `/rules/${ruleId}/enable`, undefined, signal);
  }

  disableRule(ruleId: RuleId, signal?: AbortSignal): Promise<void> {
    return this.requestVoid("PUT", `/rules/${ruleId}/disable`, undefined, signal);
  }

  deleteRule(ruleId: RuleId, signal?: AbortSignal): Promise<void> {
    return this.requestVoid("DELETE", `/rules/${ruleId}`, undefined, signal);
  }

  getVersion(signal?: AbortSignal): Promise<VersionInfo> {
    return this.get<VersionInfo>("/version", undefined, signal);
  }

  getSchedules(options: ScheduleOptions, signal?: AbortSignal): Promise<Schedule[]> {
    return this.get<Schedule[]>("/schedules", options as unknown as Query, signal);
  }

  /** 各放送局でいま流れている番組。放映中の一覧はこれで作る。 */
  getBroadcastingSchedules(isHalfWidth: boolean, signal?: AbortSignal): Promise<Schedule[]> {
    return this.get<Schedule[]>("/schedules/broadcasting", { isHalfWidth }, signal);
  }

  searchSchedules(options: ScheduleSearchOptions, signal?: AbortSignal): Promise<ScheduleProgramItem[]> {
    return this.post<ScheduleProgramItem[]>("/schedules/search", options, signal);
  }

  getChannels(signal?: AbortSignal): Promise<ChannelItem[]> {
    return this.get<ChannelItem[]>("/channels", undefined, signal);
  }

  getStreams(isHalfWidth: boolean, signal?: AbortSignal): Promise<StreamInfo> {
    return this.get<StreamInfo>("/streams", { isHalfWidth }, signal);
  }

  async startLiveHls(channelId: number, mode: number, signal?: AbortSignal): Promise<StreamId> {
    const result = await this.get<{ streamId: StreamId }>(`/streams/live/${channelId}/hls`, { mode }, signal);
    return result.streamId;
  }

  async startRecordedHls(videoFileId: VideoFileId, playPosition: number, mode: number, signal?: AbortSignal): Promise<StreamId> {
    const result = await this.get<{ streamId: StreamId }>(`/streams/recorded/${videoFileId}/hls`, { ss: playPosition, mode }, signal);
    return result.streamId;
  }

  keepStream(streamId: StreamId, signal?: AbortSignal): Promise<void> {
    return this.requestVoid("PUT", `/streams/${streamId}/keep`, undefined, signal);
  }

  stopStream(streamId: StreamId, signal?: AbortSignal): Promise<void> {
    return this.requestVoid("DELETE", `/streams/${streamId}`, undefined, signal);
  }

  getEncode(isHalfWidth: boolean, signal?: AbortSignal): Promise<EncodeInfo> {
    return this.get<EncodeInfo>("/encode", { isHalfWidth }, signal);
  }

  async addEncode(options: AddManualEncodeProgramOptions, signal?: AbortSignal): Promise<EncodeId> {
    const result = await this.post<{ encodeId: EncodeId }>("/encode", options, signal);
    return result.encodeId;
  }

  cancelEncode(encodeId: EncodeId, signal?: AbortSignal): Promise<void> {
    return this.requestVoid("DELETE", `/encode/${encodeId}`, undefined, signal);
  }

  thumbnailUrl(thumbnailId: ThumbnailId): string {
    return `${this.baseUrl}/thumbnails/${thumbnailId}`;
  }

  channelLogoUrl(channelId: number): string {
    return `${this.baseUrl}/channels/${channelId}/logo`;
  }

  videoUrl(videoFileId: VideoFileId, isDownload = false): string {
    return appendQuery(`${this.baseUrl}/videos/${videoFileId}`, isDownload ? { isDownload: true } : undefined);
  }

  videoPlaylistUrl(videoFileId: VideoFileId): string {
    return `${this.baseUrl}/videos/${videoFileId}/playlist`;
  }

  liveStreamUrl(channelId: number, streamType: string, mode: number): string {
    return appendQuery(`${this.baseUrl}/streams/live/${channelId}/${encodeURIComponent(streamType)}`, { mode });
  }

  recordedStreamUrl(videoFileId: VideoFileId, streamType: string, mode: number, playPosition = 0): string {
    return appendQuery(`${this.baseUrl}/streams/recorded/${videoFileId}/${encodeURIComponent(streamType)}`, {
      mode,
      ss: playPosition,
    });
  }

  streamPlaylistUrl(streamId: StreamId): string {
    const applicationBase = this.baseUrl.endsWith("/api") ? this.baseUrl.slice(0, -4) : "";
    return `${applicationBase}/streamfiles/stream${streamId}.m3u8`;
  }

  getTags(signal?: AbortSignal): Promise<RecordedTags> {
    return this.get<RecordedTags>("/tags", undefined, signal);
  }

  async addTag(name: string, color: string, signal?: AbortSignal): Promise<RecordedTagId> {
    const result = await this.post<{ tagId: RecordedTagId }>("/tags", { name, color }, signal);
    return result.tagId;
  }

  deleteTag(tagId: RecordedTagId, signal?: AbortSignal): Promise<void> {
    return this.requestVoid("DELETE", `/tags/${tagId}`, undefined, signal);
  }

  attachTag(tagId: RecordedTagId, recordedId: RecordedId, signal?: AbortSignal): Promise<void> {
    return this.requestVoid("PUT", `/tags/${tagId}/relate`, { recordedId }, signal);
  }

  detachTag(tagId: RecordedTagId, recordedId: RecordedId, signal?: AbortSignal): Promise<void> {
    return this.requestVoid("DELETE", appendQuery(`/tags/${tagId}/relate`, { recordedId }), undefined, signal);
  }

  getStorages(signal?: AbortSignal): Promise<StorageInfo> {
    return this.get<StorageInfo>("/storages", undefined, signal);
  }
}

export const apiClient = new EpgStationApiClient();
