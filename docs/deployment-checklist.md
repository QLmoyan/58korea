# 韩圈 部署与初始化清单

> 项目状态见 [PROJECT_STATUS.md](./PROJECT_STATUS.md)。新 AI / 新成员按 [NEW_CHAT_GUIDE.md](./NEW_CHAT_GUIDE.md) 阅读，首读 [AI_CONTEXT.md](./AI_CONTEXT.md)。

换服务器或新环境时，优先运行一条命令完成数据库迁移、构建与回归检查：

```bash
npx tsx scripts/bootstrap-project.ts
```

或：

```bash
npm run bootstrap
```

## 新服务器部署步骤

1. **准备 Supabase 项目**（人工）
   - 在 [Supabase Dashboard](https://supabase.com/dashboard) 创建项目。
   - 记录：`Project URL`、`anon key`、`service_role key`、数据库密码。

2. **配置环境变量**（人工）
   - 复制 `.env.local.example` → `.env.local`。
   - 必填：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`ADMIN_BOOTSTRAP_PASSWORD`。
   - 数据库连接三选一：`SUPABASE_DB_URL`、`DATABASE_URL`、或 `SUPABASE_DB_PASSWORD` + `NEXT_PUBLIC_SUPABASE_URL`。
   - 生产建议同时设置：`ADMIN_SESSION_SECRET`、`ADMIN_PASSWORD`。

3. **安装依赖**（可自动化）
   ```bash
   npm ci
   ```

4. **运行 bootstrap**（可自动化 — Cursor 或 CI）
   ```bash
   npx tsx scripts/bootstrap-project.ts
   ```
   依次执行：环境检查 → Supabase/DB 连通性 → 全部幂等 `scripts/apply-*.ts` → `npm run build` → `npm run regression-check`（若本地无 dev server 会自动启动）。

5. **创建站长账号**（人工或让 Cursor 执行一次）
   ```bash
   npx tsx scripts/create-admin-user.ts
   ```
   regression 与后台功能依赖已存在的 admin 用户；新库首次部署必须执行。

6. **生产进程**（人工）
   ```bash
   npm run build
   npm run start
   ```
   或使用 pm2 / systemd 守护 `next start`，并配置 HTTPS 与域名。

7. **定时任务**（人工）
   ```bash
   npx tsx scripts/process-expiring-coupons.ts
   ```
   建议 cron 每小时或每 30 分钟执行（优惠券到期提醒）。

## 本地开发初始化步骤

1. 克隆仓库，`npm ci`。
2. 配置 `.env.local`（同上）。
3. 运行 bootstrap（迁移 + build + regression）：
   ```bash
   npx tsx scripts/bootstrap-project.ts
   ```
4. 若尚无 admin：`npx tsx scripts/create-admin-user.ts`。
5. 日常开发：
   ```bash
   npm run dev
   ```
   默认监听 `0.0.0.0:3000`，手机 LAN 访问需在 `next.config.ts` 的 `allowedDevOrigins` 或环境变量 `ALLOWED_DEV_ORIGINS` 中放行 IP。

## Cursor 可以自动做的事

| 操作 | 命令 |
|------|------|
| 全量初始化与迁移 | `npx tsx scripts/bootstrap-project.ts` |
| 单个迁移脚本 | `npx tsx scripts/apply-<name>.ts` |
| 创建 admin 用户 | `npx tsx scripts/create-admin-user.ts` |
| 构建 | `npm run build` |
| 回归检查 | `npm run regression-check`（需 dev server 或 bootstrap 自动拉起） |
| 优惠券到期处理 | `npx tsx scripts/process-expiring-coupons.ts` |

Bootstrap 会自动按依赖顺序执行以下 apply 脚本（均为幂等）：

1. `apply-profiles-rls` → `apply-posts-rls` → `apply-comments-rls`
2. `apply-admin-users-v1` → `apply-content-safety-v1.2-rules`
3. `apply-post-engagement-v1` → `apply-post-views-v1` → `apply-notifications-v1`
4. `apply-user-home-v1` → `apply-profile-edit-v1` → `apply-search-users-merchants-v1`
5. `apply-channel-articles-v1` → `apply-merchant-profiles-v1`
6. `apply-merchant-coupons-v1` → `apply-post-linked-coupon-v1` → `apply-coupon-redemption-v1` → `apply-coupon-lifecycle-v1`
7. `apply-comment-images-v1` → `apply-ai-category-v1`

## 必须人工做的事

- 在 Supabase 创建项目并保管密钥（bootstrap 不会代你创建云资源）。
- 首次填写 `.env.local` 中的真实密钥与密码。
- 生产环境 DNS、SSL、防火墙、进程守护配置。
- 配置 cron 运行 `process-expiring-coupons.ts`。
- Schema 变更后手动同步 `lib/supabase/database.types.ts`（当前无 `supabase gen types` 自动化脚本）。
- 内容运营：频道文章、种子数据、第三方图库 API Key（可选）。

## 环境变量说明

| 变量 | 用途 | Bootstrap 必填 |
|------|------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | 是 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 前台 anon key | 是 |
| `SUPABASE_SERVICE_ROLE_KEY` | 回归测试与脚本（非前台业务） | 是 |
| `ADMIN_BOOTSTRAP_PASSWORD` | 回归与 create-admin-user | 是 |
| `SUPABASE_DB_URL` / `DATABASE_URL` / `SUPABASE_DB_PASSWORD` | SQL 迁移直连数据库 | 是（其一） |
| `ADMIN_SESSION_SECRET` | /admin 会话 | 生产建议 |
| `ADMIN_PASSWORD` | 旧版 admin 登录 | 可选 |
| `REGRESSION_BASE_URL` | 回归 HTTP 基址，默认 `http://localhost:3000` | 可选 |

## 故障排查

- **Missing .env.local**：复制 example 并填写。
- **PostgreSQL 连接失败**：检查 `SUPABASE_DB_PASSWORD` 或完整 `SUPABASE_DB_URL`；Supabase Dashboard → Settings → Database。
- **apply-*.ts 失败**：bootstrap 会标明具体脚本名与退出码；可单独重跑该脚本。
- **regression-check 失败**：确认 admin 用户存在、dev server 可访问；查看失败项名称与错误信息。
- **Dev server 超时**：端口 3000 被占用或 Next 编译过慢；可手动 `npm run dev` 后再跑 bootstrap。
