# GitHub Pages でデモを公開する

公開デモは Next.js の静的出力とブラウザ内のサンプル API だけで動作します。実際の TNLAStation Backend、録画ファイル、認証情報には接続しません。

## デモの制約

- 番組、予約、録画、ストレージ情報はブラウザ内で生成するサンプルです。
- 追加・更新・削除操作は成功扱いになりますが、再読み込み後まで状態を保存しません。
- 動画とライブストリームは配信しません。
- ヘッダーの `DEMO` バッジで通常版と区別できます。

## ローカル確認

Node.js 24.x で次を実行します。

```sh
npm ci
npm run build:demo
npx serve out
```

表示されたローカル URL を開きます。通常の `npm run dev` と `npm run build` は従来どおり実バックエンド向けです。

## GitHub Pages へ公開

`.github/workflows/deploy-pages.yml` が `main` への push と手動実行でデモをビルドし、Pages へデプロイします。

初回だけ GitHub のリポジトリ画面で次を設定します。

1. Settings > Pages を開く。
2. Build and deployment の Source に `GitHub Actions` を選ぶ。
3. Actions タブで `Deploy Demo to GitHub Pages` を手動実行するか、`main` へ変更を push する。

このリポジトリでは公開 URL は通常 `https://miutaku.github.io/TNLAStation-frontend/` です。workflow は GitHub が返す `base_path` をビルドへ渡すため、fork のリポジトリ名や独自ドメインでも静的アセット、Manifest、Service Worker の URL が揃います。

## 構成

- `next.config.ts`: `TNLASTATION_DEMO=1` のときだけ静的 export と Pages の base path を使用
- `lib/api/demo.ts`: ブラウザ内で EPGStation 互換のサンプル応答を返す
- `public/demo/`: デモ用の局ロゴとサムネイル
- `out/`: Next.js が生成する公開ファイル（Git 管理外）
- `.github/workflows/deploy-pages.yml`: ビルド、artifact upload、Pages deploy
