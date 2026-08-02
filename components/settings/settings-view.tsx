"use client";

import { useCallback } from "react";
import { ExternalLink, Info, MonitorCog, RotateCcw, SlidersHorizontal, Smartphone, Tv } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { GuideDimensionSettings } from "@/components/guide/guide-dimension-settings";
import { AccentColorSettings } from "@/components/settings/accent-color-settings";
import { BottomBarItemsSettings } from "@/components/settings/bottom-bar-settings";
import { GlassOpacitySettings } from "@/components/settings/glass-opacity-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { displayVersion, frontendVersion } from "@/lib/app-version";
import { apiClient } from "@/lib/api/client";
import type { VersionInfo } from "@/lib/api/types";
import { useApiResource } from "@/lib/hooks/use-api-resource";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { GUIDE_LENGTH_OPTIONS, type AppPreferences, type ThemePreference } from "@/lib/preferences";

const selectClassName =
  "h-10 min-w-0 w-full max-w-full rounded-lg border border-input bg-background/75 px-3 text-sm shadow-xs disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-32 sm:w-auto";

function SettingRow({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-5 py-4 first:pt-0 last:pb-0">
      <div>
        <p id={`${id}-label`} className="text-sm font-semibold">{title}</p>
        <p id={`${id}-description`} className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-description`}
        onClick={() => onCheckedChange(!checked)}
      />
    </div>
  );
}

function SelectRow<T extends string | number>({
  id,
  title,
  description,
  value,
  options,
  onChange,
}: {
  id: string;
  title: string;
  description: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <label htmlFor={id} className="text-sm font-semibold">{title}</label>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value as T)} className={selectClassName}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

export function SettingsView() {
  const { preferences, updatePreferences, resetPreferences } = usePreferences();
  const loadVersion = useCallback(
    (signal: AbortSignal): Promise<VersionInfo> => apiClient.getVersion(signal),
    [],
  );
  const version = useApiResource(loadVersion);

  const numberOptions = <T extends number>(values: readonly T[]): { value: T; label: string }[] =>
    values.map((value) => ({ value, label: `${value}件` }));
  const backendName = version.data?.backend === "tnlastation"
    ? "TNLAStation Backend"
    : version.data?.backend === "other"
      ? "その他の互換バックエンド"
      : "Backend";
  const backendVersionLabel = version.data
    ? displayVersion(version.data.backendVersion)
    : version.isLoading
      ? "取得中…"
      : "取得できません";

  return (
    <>
      <PageHeader
        eyebrow="Preferences"
        title="設定"
        description="このブラウザーでの表示方法を変更します。設定内容は端末内に自動保存されます。"
        actions={
          <Button type="button" variant="outline" onClick={resetPreferences}>
            <RotateCcw aria-hidden="true" />
            初期値に戻す
          </Button>
        }
      />

      <div className="space-y-6">
        <Card className="">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><MonitorCog aria-hidden="true" className="size-5" /></span>
              <div>
                <CardTitle>表示</CardTitle>
                <CardDescription>テーマと言語表記を調整します</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="divide-y pt-5 sm:pt-6">
            <SelectRow<ThemePreference>
              id="theme"
              title="カラーテーマ"
              description="OS に合わせるか、明るい／暗いテーマを固定します。"
              value={preferences.theme}
              options={[
                { value: "system", label: "OS に合わせる" },
                { value: "light", label: "ライト" },
                { value: "dark", label: "ダーク" },
              ]}
              onChange={(theme) => updatePreferences({ theme })}
            />
            <div className="py-4 first:pt-0 last:pb-0">
              <p className="text-sm font-semibold">ガラスの透過</p>
              <p className="mt-1 mb-3 text-xs leading-5 text-muted-foreground">
                サイドバーや見出しバー、ボトムバーの背後がどれだけ透けるかを変えます。
              </p>
              <GlassOpacitySettings
                value={preferences.glassOpacity}
                disabled={preferences.glassDisabled}
                onChange={(glassOpacity) => updatePreferences({ glassOpacity })}
              />
            </div>
            <SettingRow
              id="glass-disabled"
              title="すりガラスを無効にする"
              description="上のスライダーに関わらず、背後を一切透かさない不透明な面にします (backdrop-filter 自体を使わないため、低性能な端末での負荷軽減にもなります)。"
              checked={preferences.glassDisabled}
              onCheckedChange={(glassDisabled) => updatePreferences({ glassDisabled })}
            />
            <SettingRow
              id="half-width"
              title="半角表示"
              description="番組情報を半角文字で取得します。"
              checked={preferences.isHalfWidthDisplayed}
              onCheckedChange={(isHalfWidthDisplayed) => updatePreferences({ isHalfWidthDisplayed })}
            />
            <SettingRow
              id="app-header"
              title="ヘッダーを表示"
              description="画面上部のロゴ・アプリ名のヘッダーを表示します。"
              checked={preferences.isShowAppHeader}
              onCheckedChange={(isShowAppHeader) => updatePreferences({ isShowAppHeader })}
            />
            <div className="py-4 first:pt-0 last:pb-0">
              <p className="text-sm font-semibold">アクセントカラー</p>
              <p className="mt-1 mb-3 text-xs leading-5 text-muted-foreground">
                ボタンや選択状態に使う差し色を選べます。明るさはライト／ダークのテーマに合わせて自動調整します。
              </p>
              <AccentColorSettings
                value={preferences.accentHue}
                onChange={(accentHue) => updatePreferences({ accentHue })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Tv aria-hidden="true" className="size-5" /></span>
              <div>
                <CardTitle>番組表</CardTitle>
                <CardDescription>取得範囲と表示対象を設定します</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="divide-y pt-5 sm:pt-6">
            <SelectRow<number>
              id="guide-length"
              title="表示時間"
              description="番組表に縦に表示する時間数です。1〜24 時間。"
              value={preferences.guideLength}
              options={GUIDE_LENGTH_OPTIONS.map((value) => ({ value, label: `${value}時間` }))}
              onChange={(guideLength) => updatePreferences({ guideLength: Number(guideLength) })}
            />
            <GuideDimensionSettings
              idPrefix="settings-guide"
              columnScale={preferences.guideColumnScale}
              pixelsPerMinute={preferences.guidePixelsPerMinute}
              onColumnScaleChange={(guideColumnScale) => updatePreferences({ guideColumnScale })}
              onPixelsPerMinuteChange={(guidePixelsPerMinute) => updatePreferences({ guidePixelsPerMinute })}
            />
            <SettingRow
              id="free-programs"
              title="無料放送のみ"
              description="番組表から有料放送を除外します。"
              checked={preferences.isShowOnlyFreePrograms}
              onCheckedChange={(isShowOnlyFreePrograms) => updatePreferences({ isShowOnlyFreePrograms })}
            />
            <SettingRow
              id="guide-channel-logos"
              title="放送局ロゴを表示"
              description="番組表の局見出しにロゴを表示します。モバイルでは局名の上に小さく配置します。"
              checked={preferences.isShowGuideChannelLogos}
              onCheckedChange={(isShowGuideChannelLogos) => updatePreferences({ isShowGuideChannelLogos })}
            />
            <SettingRow
              id="guide-channel-info"
              title="放送波・チャンネル番号を表示"
              description="番組表の局見出しの下に放送波の種別とリモコン番号を表示します。"
              checked={preferences.isShowGuideChannelInfo}
              onCheckedChange={(isShowGuideChannelInfo) => updatePreferences({ isShowGuideChannelInfo })}
            />
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><SlidersHorizontal aria-hidden="true" className="size-5" /></span>
              <div>
                <CardTitle>一覧</CardTitle>
                <CardDescription>1ページの件数と録画情報を調整します</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="divide-y pt-5 sm:pt-6">
            <SelectRow<AppPreferences["reservesLength"]>
              id="reserves-length"
              title="予約の表示件数"
              description="予約一覧で一度に取得する件数です。"
              value={preferences.reservesLength}
              options={numberOptions([12, 24, 48] as const)}
              onChange={(reservesLength) => updatePreferences({ reservesLength: Number(reservesLength) as AppPreferences["reservesLength"] })}
            />
            <SelectRow<AppPreferences["recordedLength"]>
              id="recorded-length"
              title="録画済みの表示件数"
              description="録画ライブラリで一度に取得する件数です。"
              value={preferences.recordedLength}
              options={numberOptions([12, 24, 48] as const)}
              onChange={(recordedLength) => updatePreferences({ recordedLength: Number(recordedLength) as AppPreferences["recordedLength"] })}
            />
            <SettingRow
              id="drop-information"
              title="ドロップ情報を表示"
              description="録画カードにドロップ数と受信状態を表示します。"
              checked={preferences.isShowDropInfo}
              onCheckedChange={(isShowDropInfo) => updatePreferences({ isShowDropInfo })}
            />
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Smartphone aria-hidden="true" className="size-5" /></span>
              <div>
                <CardTitle>ボトムバー</CardTitle>
                <CardDescription>モバイル画面下部に表示する項目と並び順を選べます</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5 sm:pt-6">
            <BottomBarItemsSettings
              value={preferences.bottomBarItems}
              onChange={(bottomBarItems) => updatePreferences({ bottomBarItems })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Info aria-hidden="true" className="size-5" /></span>
              <div>
                <CardTitle>バージョン情報</CardTitle>
                <CardDescription>稼働しているfrontendとbackendのバージョンです</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="divide-y pt-5 sm:pt-6">
            <div className="flex items-center justify-between gap-4 pb-4">
              <span className="text-sm font-semibold">Frontend</span>
              <span className="font-mono text-sm text-muted-foreground">{displayVersion(frontendVersion)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-4">
              <span className="text-sm font-semibold">{backendName}</span>
              <span className="font-mono text-sm text-muted-foreground">{backendVersionLabel}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 px-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>API仕様やリクエストを確認する開発者向け画面です。</span>
          <Button asChild variant="ghost" size="sm">
            <a href={apiClient.swaggerUrl()} target="_blank" rel="noreferrer">
              Swagger UIを開く
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
    </>
  );
}
