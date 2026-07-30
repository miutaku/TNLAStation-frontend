# アーキテクチャ

## ディレクトリ

```text
app/                  Next.js App Routerのページ、metadata、共通style
components/ui/        ローカル所有するUI primitive
components/*/         機能・画面単位のclient component
lib/api/              EPGStation互換APIの型とclient
lib/hooks/            データ取得と表示設定のReact hooks
lib/preferences.ts    ブラウザ保存する表示設定
lib/format.ts         日時、時間、容量、ジャンル表示
public/               PWAと静的asset
```

## レンダリングとデータ取得

ページの入口とmetadataはApp Routerへ置き、操作・データ取得を担う画面はclient componentへ分離します。
API通信は`EpgStationApiClient`へ集約し、画面からURLやHTTP処理を直接組み立てません。

`useApiResource`は読み込み、エラー、再試行、表示を維持した再検証を共通化します。
変更操作はAPI成功後に対象resourceを再取得し、画面とbackendの状態を揃えます。

## API互換

APIの型は`lib/api/types.ts`、通信は`lib/api/client.ts`へ集約します。
TNLAStation固有情報は互換JSONへ追加せず、response headerなど互換面を壊さない方法で取得します。

## 表示設定

表示設定は`lib/preferences.ts`でschema、既定値、復元時のvalidationを管理します。
React componentが個別に`localStorage`を解釈しない構成です。

## 品質保証

CIでは次を実行します。

1. lockfileから依存関係をinstall
2. production dependencyの脆弱性監査
3. ESLint
4. TypeScript型検査
5. Vitest
6. Next.js production build
7. container build

テストではAPI pathとrequest body、API error変換、fixtureの型、表示設定の復元、
日時・時間・容量・進捗のformat、主要画面の構造を確認します。
