# TNLAStation Frontend

[![CI](https://github.com/miutaku/TNLAStation-frontend/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/miutaku/TNLAStation-frontend/actions/workflows/ci.yml)
[![Release](https://github.com/miutaku/TNLAStation-frontend/actions/workflows/release.yml/badge.svg)](https://github.com/miutaku/TNLAStation-frontend/actions/workflows/release.yml)
[![GitHub Release](https://img.shields.io/github/v/release/miutaku/TNLAStation-frontend?cacheSeconds=300)](https://github.com/miutaku/TNLAStation-frontend/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

EPGStation互換Web APIを利用する、TNLAStationのモバイルフレンドリーなWebフロントエンドです。
[TNLAStation Backend](https://github.com/miutaku/TNLAStation-backend)を標準の接続先とし、
iOS、Android、PCから録画サーバーを操作できます。

## 主な機能

- 予約・録画状況をまとめるダッシュボード
- 放送局ロゴ、表示倍率、ジャンル強調に対応した番組表
- 番組検索、番組予約、時刻指定予約、自動予約ルール
- 放送中番組と録画済み番組のブラウザ視聴
- 録画ファイルの管理、アップロード、ダウンロード
- エンコードキューとストレージ状況の確認
- PWAによるホーム画面追加とスタンドアロン表示
- テーマ、アクセントカラー、番組表、一覧、ボトムバーの端末別設定

## 必要な環境

- Node.js 24.x
- TNLAStation Backend、または対応範囲を満たすEPGStation互換API

一式を動かす場合は、backendやgatewayをまとめた
[TNLAStation Composeリポジトリ](https://github.com/miutaku/TNLAStation)の利用を推奨します。

## ローカル開発

```sh
npm ci
cp .env.example .env.local
npm run dev
```

ブラウザで`http://localhost:3000`を開きます。既定では同一オリジンの`/api`へ接続します。
別オリジンへ接続する場合は次のように設定します。

```sh
NEXT_PUBLIC_TNLA_API_BASE=https://backend.example.com/api npm run dev
```

詳しくは[セットアップ](docs/setup.md)と[バックエンド接続](docs/backend-connection.md)を参照してください。

## ドキュメント

- [ドキュメント一覧](docs/README.md)
- [セットアップ](docs/setup.md)
- [バックエンド接続](docs/backend-connection.md)
- [画面と表示設定](docs/user-interface.md)
- [アーキテクチャ](docs/architecture.md)
- [コントリビューション](CONTRIBUTING.md)
- [リリース手順](RELEASING.md)
- [セキュリティポリシー](SECURITY.md)

## ライセンス

[MIT License](LICENSE)
