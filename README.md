# TNLAStation Frontend

[EPGStation](https://github.com/l3tnun/EPGStation) 互換の Web API を話すバックエンドを利用する、TNLAStation の Web フロントエンドです  
標準では [TNLAStation Backend](https://github.com/miutaku/TNLAStation-backend) を想定していますが、API 仕様が同じなので EPGStation 本体をバックエンドにしてもおそらく動作します  
iOS・Android・PC のいずれでも快適に使えるモバイルフレンドリーな UI が特徴です  
このリポジトリは Web インターフェイスのみを提供し、録画管理本体はバックエンド側が担います

## 機能

### 番組の視聴・録画・管理

- ブラウザでの Web インターフェイス操作
  - ダッシュボード（予約・録画中・録画済みの概況表示）
  - 番組表の表示
  - 番組検索
  - 番組単位の予約
    - 番組表からの手動予約
    - ルールによる自動予約
  - 番組の視聴
    - 放送中番組のライブ視聴
    - 録画済み番組のストリーミング視聴
    - 録画済み番組のダウンロード
  - 録画ファイルのアップロード
  - エンコードの管理
  - ストレージ使用状況の確認
- PWA 対応
  - iOS / Android のホーム画面に追加し、ブラウザ UI なしのスタンドアロン表示で利用可能
- 表示設定
  - カラーテーマ、アクセントカラー、ガラスの透過、ボトムバーの並びなどをブラウザ内に保存

## 動作環境

- [Node.js](https://nodejs.org/) : 24.x
- EPGStation 互換 API サーバー（[TNLAStation Backend](https://github.com/miutaku/TNLAStation-backend) または [EPGStation](https://github.com/l3tnun/EPGStation) 本体）: 同一オリジン、または CORS を許可した別オリジンで稼働していること

---

## セットアップ方法

### ローカル開発

```bash
npm install
cp .env.example .env.local
npm run dev
```

- ブラウザで `http://localhost:3000` を開く
- 同一オリジンの `/api` が必要なため、開発環境では TNLAStation Backend と合わせたリバースプロキシ、または下記の環境変数の設定が必要

### 別オリジンのバックエンドへ接続する場合

- ビルド時に接続先を指定する（接続先側では CORS の許可が必要）

  ```bash
  NEXT_PUBLIC_TNLA_API_BASE=https://tnlastation-backend.example.com/api npm run build
  ```

- EPGStation 本体を直接指定しても動作する
- 本番では、フロントエンドとバックエンドを同一オリジンでリバースプロキシする構成を推奨

---

## Docker でのセットアップ

```bash
docker build -t tnlastation-frontend .
docker run --rm -p 3000:3000 tnlastation-frontend
```

- API 接続先を変更してビルドする例

  ```bash
  docker build \
    --build-arg NEXT_PUBLIC_TNLA_API_BASE=https://tnlastation-backend.example.com/api \
    -t tnlastation-frontend .
  ```

- イメージは Node.js 24 Alpine 上で Next.js の standalone server を非 root ユーザーとして実行する

---

## 品質確認

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

- Vitest では、型付き fixture を使った各 API path・検索 body、API クライアントのクエリ生成／エラー変換、表示設定の復元、日時・時間・ファイルサイズ・進捗などの表示ユーティリティを検証する
- GitHub Actions でも Node.js 24 を使い、lockfile install、依存監査、lint、型検査、テスト、本番ビルド、Docker image build を順に実行する

リリース方法は [RELEASING.md](RELEASING.md)、開発への参加方法は
[CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

---

## API 接続

- 独自の Next.js API Route は持たない
- ブラウザからバックエンドの API を直接呼び出す（既定のベース URL は同一オリジンの `/api`）
- API は EPGStation 互換の仕様で実装されており、型定義は EPGStation の `api.d.ts` と `api.yml` を一次資料にした必要範囲を `lib/api/types.ts` に置いている
  - `ProgramVideoResolution` は実際の Mirakurun 応答との互換性のため `1080p` も受理する

| 画面 | 使用する API |
| --- | --- |
| ダッシュボード | `GET /api/config`, `/api/version`, `/api/reserves`, `/api/recorded` |
| 番組表 | `GET /api/config`, `/api/schedules` |
| 番組検索 | `POST /api/schedules/search` |
| 予約一覧・時刻指定予約 | `GET /api/reserves`, `POST /api/reserves` |
| 録画中 | `GET /api/recording` |
| 録画済み一覧・詳細 | `GET /api/recorded`, `/api/recorded/:id`, `PUT /api/recorded/:id/protect`, `/unprotect`, `DELETE /api/recorded/:id` |
| 録画登録 | `POST /api/recorded`, `POST /api/videos/upload` |
| 録画ルール（`/rule`） | `GET/POST /api/rules`, `PUT /api/rules/:id/enable`, `/disable`, `DELETE /api/rules/:id` |
| 放映中・視聴 | `GET /api/channels`, `/api/streams`, `/api/streams/live/:id/*`, `/api/streams/recorded/:id/*` |
| エンコード | `GET/POST /api/encode`, `DELETE /api/encode/:id` |
| ストレージ | `GET /api/storages` |
| 設定 | `GET /api/config`, `/api/version` |

---

## ディレクトリ

```text
app/                  App Router のページと共通スタイル
components/ui/        ローカル所有する UI プリミティブ
components/*/         各画面のクライアントコンポーネント
lib/api/              バックエンド API (EPGStation 互換) の型とクライアント
lib/hooks/            データ取得・表示設定の React hooks
lib/format.ts         日時・時間・容量・ジャンル表示
```

## Tips

### 表示設定の保存先

- 表示設定はブラウザーの `localStorage` に保存され、サーバー設定は変更しない
- 各データ画面には読み込み中、取得エラー、0 件の状態と再試行導線がある

## Licence

[MIT Licence](LICENSE)
