# コントリビューション

IssueやPull Requestを歓迎します。UI変更は、可能なら変更前後の
スクリーンショットを添えてください。

## 開発手順

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

- `main` から作業ブランチを作る
- PRは1つの目的に絞り、関連Issueを記載する
- API互換性、アクセシビリティ、モバイル表示への影響を確認する
- ログや画像から秘密情報を除去する
- セキュリティ上の問題は公開Issueにせず、[SECURITY.md](SECURITY.md)に従う

大きな仕様変更は先にIssueで方向性を確認してください。
リリースタグの作成はメンテナーが行います。
