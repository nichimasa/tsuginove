# つぎノベ 📖

友達と一緒に作るリレー小説Webアプリ。直前の文章だけを読んで物語をつなごう。

## 特徴

- **招待制リレー小説** — 招待リンクで友達を集めてルームを作成
- **直前投稿のみ表示** — 物語全体は見えず、直前の文章だけを頼りに続きを書く
- **完成後に全文公開** — 全員投稿後に初めて物語全体が読める
- **LINE・SNS共有** — 完成作品を限定公開リンクで共有可能
- **スマホ対応** — モバイルファーストのレスポンシブデザイン

## 技術スタック

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL + Auth + RLS)
- **Deploy**: Vercel

## セットアップ

### 1. Supabaseプロジェクトを作成

[supabase.com](https://supabase.com) でプロジェクトを作成し、`supabase/schema.sql` を SQL Editor で実行してください。

Authentication > Providers で **Google** を有効化してください。

### 2. 環境変数を設定

```bash
cp .env.example .env.local
```

`.env.local` を編集：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. 依存関係をインストール

```bash
npm install
```

### 4. 開発サーバーを起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開く。

## Vercelへのデプロイ

1. GitHubリポジトリをVercelに接続
2. 環境変数を設定（`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`）
3. Supabase Auth の Redirect URLs に `https://your-app.vercel.app/auth/callback` を追加

## 画面一覧

| 画面 | パス |
|------|------|
| ログイン | `/login` |
| 新規登録 | `/register` |
| ホーム | `/` |
| ルーム作成 | `/rooms/new` |
| ルーム詳細 | `/rooms/[roomId]` |
| 投稿画面 | `/rooms/[roomId]/post` |
| 完成作品 | `/rooms/[roomId]/complete` |
| 招待参加 | `/invite/[token]` |
| 通知 | `/notifications` |
| マイページ | `/profile` |

## ライセンス

MIT
