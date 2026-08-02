"use client";

import { ArrowLeft, RotateCcw, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { GuideDimensionSettings } from "@/components/guide/guide-dimension-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { GENRE_ENTRIES } from "@/lib/format";
import { usePreferences } from "@/lib/hooks/use-preferences";
import { GUIDE_LENGTH_OPTIONS, type GuideDrawMode } from "@/lib/preferences";

const DRAW_MODES: { value: GuideDrawMode; label: string; description: string }[] = [
  { value: "sequential", label: "逐次", description: "手前から数フレームに分けて描画。開いたときの引っかかりが小さい。" },
  { value: "minimal", label: "最小", description: "画面に入っている列だけ描画。局数が多いほど軽い。" },
  { value: "all", label: "すべて", description: "全チャンネルを一度に描画。最も重いが取りこぼしがない。" },
];

const selectClassName = "h-10 min-w-0 w-full max-w-full rounded-lg border border-input bg-background/75 px-3 text-sm shadow-xs sm:w-auto";

export function GuideSettingView() {
  const { preferences, updatePreferences, resetPreferences } = usePreferences();

  const toggleGenre = (genre: number) => {
    const selected = preferences.guideGenres.includes(genre)
      ? preferences.guideGenres.filter((value) => value !== genre)
      : [...preferences.guideGenres, genre];
    updatePreferences({ guideGenres: selected });
  };

  return (
    <>
      <PageHeader
        eyebrow="Program guide preferences"
        title="番組表設定"
        description="番組表の取得範囲と文字表記をこのブラウザー向けに調整します。変更は自動保存されます。"
        actions={<Button asChild variant="ghost"><Link href="/guide"><ArrowLeft aria-hidden="true" />番組表へ戻る</Link></Button>}
      />

      <Card className="mx-auto max-w-3xl">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><SlidersHorizontal aria-hidden="true" className="size-5" /></span>
            <div><CardTitle>表示オプション</CardTitle><CardDescription>次回の番組表取得から反映されます</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="divide-y pt-5 sm:pt-6">
          <div className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
            <div><label htmlFor="guide-setting-length" className="text-sm font-semibold">表示時間</label><p className="mt-1 text-xs leading-5 text-muted-foreground">その時刻から何時間ぶんを縦に表示するか。1〜24 時間。</p></div>
            <select
              id="guide-setting-length"
              className={selectClassName}
              value={preferences.guideLength}
              onChange={(event) => updatePreferences({ guideLength: Number(event.target.value) })}
            >
              {GUIDE_LENGTH_OPTIONS.map((hours) => (
                <option key={hours} value={hours}>{hours} 時間</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div><label htmlFor="guide-setting-draw" className="text-sm font-semibold">描画</label><p className="mt-1 text-xs leading-5 text-muted-foreground">{DRAW_MODES.find((mode) => mode.value === preferences.guideDrawMode)?.description}</p></div>
            <select
              id="guide-setting-draw"
              className={selectClassName}
              value={preferences.guideDrawMode}
              onChange={(event) => updatePreferences({ guideDrawMode: event.target.value as GuideDrawMode })}
            >
              {DRAW_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>
          </div>
          <GuideDimensionSettings
            idPrefix="guide-setting"
            columnScale={preferences.guideColumnScale}
            pixelsPerMinute={preferences.guidePixelsPerMinute}
            onColumnScaleChange={(guideColumnScale) => updatePreferences({ guideColumnScale })}
            onPixelsPerMinuteChange={(guidePixelsPerMinute) => updatePreferences({ guidePixelsPerMinute })}
          />
          <div className="flex items-start justify-between gap-5 py-4">
            <div><p id="guide-free-label" className="text-sm font-semibold">無料放送のみ</p><p id="guide-free-description" className="mt-1 text-xs leading-5 text-muted-foreground">有料放送の番組を番組表から除外します。</p></div>
            <Switch checked={preferences.isShowOnlyFreePrograms} aria-labelledby="guide-free-label" aria-describedby="guide-free-description" onClick={() => updatePreferences({ isShowOnlyFreePrograms: !preferences.isShowOnlyFreePrograms })} />
          </div>
          <div className="flex items-start justify-between gap-5 py-4">
            <div><p id="guide-logo-label" className="text-sm font-semibold">放送局ロゴを表示</p><p id="guide-logo-description" className="mt-1 text-xs leading-5 text-muted-foreground">局見出しにロゴを表示します。モバイルでは局名の上に小さく配置し、列幅を広げません。</p></div>
            <Switch checked={preferences.isShowGuideChannelLogos} aria-labelledby="guide-logo-label" aria-describedby="guide-logo-description" onClick={() => updatePreferences({ isShowGuideChannelLogos: !preferences.isShowGuideChannelLogos })} />
          </div>
          <div className="flex items-start justify-between gap-5 py-4">
            <div><p id="guide-channel-info-label" className="text-sm font-semibold">放送波・チャンネル番号を表示</p><p id="guide-channel-info-description" className="mt-1 text-xs leading-5 text-muted-foreground">局見出しの下に放送波の種別とリモコン番号を表示します。</p></div>
            <Switch checked={preferences.isShowGuideChannelInfo} aria-labelledby="guide-channel-info-label" aria-describedby="guide-channel-info-description" onClick={() => updatePreferences({ isShowGuideChannelInfo: !preferences.isShowGuideChannelInfo })} />
          </div>
          <div className="flex items-start justify-between gap-5 py-4">
            <div><p id="guide-half-label" className="text-sm font-semibold">半角表示</p><p id="guide-half-description" className="mt-1 text-xs leading-5 text-muted-foreground">API から半角文字の番組情報を取得します。</p></div>
            <Switch checked={preferences.isHalfWidthDisplayed} aria-labelledby="guide-half-label" aria-describedby="guide-half-description" onClick={() => updatePreferences({ isHalfWidthDisplayed: !preferences.isHalfWidthDisplayed })} />
          </div>
          <fieldset className="py-4">
            <legend className="text-sm font-semibold">表示するジャンル</legend>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">選んだジャンルを番組表で目立たせ、それ以外は淡く表示します。何も選ばなければ全ジャンルを通常表示します。</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {GENRE_ENTRIES.map((genre) => {
                const active = preferences.guideGenres.includes(genre.value);
                return (
                  <button
                    key={genre.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleGenre(genre.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background/75 text-muted-foreground hover:bg-muted"}`}
                  >
                    {genre.label}
                  </button>
                );
              })}
            </div>
            {preferences.guideGenres.length > 0 ? (
              <button type="button" onClick={() => updatePreferences({ guideGenres: [] })} className="mt-3 text-xs font-medium text-primary hover:underline">
                すべてのジャンルを表示 (選択解除)
              </button>
            ) : null}
          </fieldset>
          <div className="pt-5"><Button type="button" variant="outline" onClick={resetPreferences}><RotateCcw aria-hidden="true" />すべての表示設定を初期値に戻す</Button></div>
        </CardContent>
      </Card>
    </>
  );
}
