# セットアップ

## 動作環境

- Node.js 24.x
- npm 11.6.2
- TNLAStation Backend、または対応するEPGStation互換API

通常運用では、gateway、backend、PostgreSQL、FFmpeg Workerと一緒に起動する
[TNLAStation Composeリポジトリ](https://github.com/miutaku/TNLAStation)を推奨します。

## ローカル開発

```sh
npm ci
cp .env.example .env.local
npm run dev
```

ブラウザで`http://localhost:3000`を開きます。`.env.local`でAPIの接続先を指定できます。

```env
NEXT_PUBLIC_TNLA_API_BASE=http://localhost:8080/api
```

接続先が別オリジンの場合、backend側でfrontendのoriginからのCORSを許可してください。
開発・本番とも、可能なら同一オリジンの`/api`へリバースプロキシする構成を推奨します。

## Docker

```sh
docker build --tag tnlastation-frontend:local .
docker run --rm --publish 3000:3000 tnlastation-frontend:local
```

API接続先はビルド時に埋め込みます。

```sh
docker build \
  --build-arg NEXT_PUBLIC_TNLA_API_BASE=https://backend.example.com/api \
  --tag tnlastation-frontend:local .
```

リリースビルドでは`NEXT_PUBLIC_TNLASTATION_VERSION`もタグから自動注入されます。
イメージはNode.js 24 Alpine上のNext.js standalone serverを非rootユーザーで実行します。

## 品質確認

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Pull Requestを作成する前に4つすべてを実行してください。
