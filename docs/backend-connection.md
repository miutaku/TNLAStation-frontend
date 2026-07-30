# バックエンド接続

## 接続方式

frontendは独自のNext.js API Routeを持たず、ブラウザからbackendのWeb APIを直接呼び出します。
既定のベースURLは同一オリジンの`/api`です。

```env
NEXT_PUBLIC_TNLA_API_BASE=/api
```

別オリジンも指定できます。

```env
NEXT_PUBLIC_TNLA_API_BASE=https://backend.example.com/api
```

この値はクライアントbundleへ入る公開設定です。秘密情報を設定しないでください。

## 推奨するリバースプロキシ

本番ではfrontendとbackendを同一オリジンにまとめる構成を推奨します。

```text
https://tv.example.com/       -> frontend
https://tv.example.com/api/*  -> backend
```

別オリジンで利用する場合はbackend側のCORS設定が必要です。動画・HLS・ロゴなどもブラウザから到達できることを確認してください。

## backendの識別

設定画面は`GET /api/version`を使用します。TNLAStation Backendは
`X-TNLAStation-Version` response headerを返すため、製品名と固有バージョンを表示できます。
このheaderがない接続先は、EPGStation本体と断定せず「その他の互換バックエンド」と表示します。

## API型

`lib/api/types.ts`はEPGStation 2.10.0の`api.d.ts`と`api.yml`を一次資料にした、
frontendが使用する範囲の型定義です。実際のMirakurun応答との互換性のため、
`ProgramVideoResolution`は`1080p`も受理します。

## 画面別の主なAPI

| 画面 | API |
| --- | --- |
| ダッシュボード | `config`、`version`、`reserves`、`recorded` |
| 番組表 | `config`、`schedules` |
| 番組検索 | `schedules/search` |
| 予約 | `reserves` |
| 録画中 | `recording` |
| 録画済み | `recorded`、`videos`、`thumbnails`、`tags` |
| 自動予約ルール | `rules` |
| 放送中・視聴 | `channels`、`streams` |
| エンコード | `encode` |
| ストレージ | `storages` |
| 設定 | `config`、`version` |

API全体の仕様はbackendが公開する`/api/docs`または`/api-docs`を参照してください。
設定ページの「Swagger UIを開く」からも移動できます。
