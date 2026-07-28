"use client";

import { Plus, Tag, X } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";
import type { RecordedId, RecordedTag, RecordedTags } from "@/lib/api/types";
import { useApiResource } from "@/lib/hooks/use-api-resource";

/**
 * 録画へ付ける tag。付いているものと、付けられるものを 1 画面で扱う。tag を作ってから
 * 付けに戻る、という往復をさせない。
 */
export function RecordedTagEditor({
  recordedId,
  attached,
  onChanged,
}: {
  recordedId: RecordedId;
  attached: RecordedTag[];
  onChanged: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadTags = useCallback((signal: AbortSignal): Promise<RecordedTags> => apiClient.getTags(signal), []);
  const tags = useApiResource(loadTags);
  const attachedIds = new Set(attached.map((tag) => tag.id));

  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await operation();
      tags.revalidate();
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "タグを変更できませんでした。");
    } finally {
      setBusy(false);
    }
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await run(async () => {
      // 作ったらそのまま付ける。付けるつもりが無いのに作る場面がない。
      const tagId = await apiClient.addTag(name, "#4caf50");
      await apiClient.attachTag(tagId, recordedId);
      setNewName("");
    });
  };

  return (
    <Card>
      <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Tag aria-hidden="true" className="size-4" />タグ</CardTitle></CardHeader>
      <CardContent className="space-y-4 pt-5 sm:pt-6">
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          {attached.length === 0 ? <p className="text-sm text-muted-foreground">タグは付いていません。</p> : null}
          {attached.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
              style={{ borderColor: tag.color, color: tag.color }}
            >
              <span className="min-w-0 truncate" title={tag.name}>{tag.name}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-4"
                aria-label={`${tag.name} を外す`}
                disabled={busy}
                onClick={() => void run(() => apiClient.detachTag(tag.id, recordedId))}
              >
                <X aria-hidden="true" className="size-3" />
              </Button>
            </span>
          ))}
        </div>

        {tags.data && tags.data.tags.some((tag) => !attachedIds.has(tag.id)) ? (
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">付けられるタグ</p>
            <div className="flex flex-wrap gap-2">
              {tags.data.tags.filter((tag) => !attachedIds.has(tag.id)).map((tag) => (
                <Button
                  key={tag.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="max-w-full"
                  disabled={busy}
                  onClick={() => void run(() => apiClient.attachTag(tag.id, recordedId))}
                >
                  <Plus aria-hidden="true" /><span className="min-w-0 truncate" title={tag.name}>{tag.name}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <form onSubmit={(event) => void create(event)} className="flex gap-2">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="新しいタグ名"
            maxLength={64}
            aria-label="新しいタグ名"
          />
          <Button type="submit" variant="outline" disabled={busy || !newName.trim()}><Plus aria-hidden="true" />作成</Button>
        </form>
      </CardContent>
    </Card>
  );
}
