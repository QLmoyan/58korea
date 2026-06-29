# DECISIONS

> 自动生成文件。请勿手改。重大决策写入 `docs/project-state.json` → `decisions` 数组**顶部**，然后运行 `npm run sync-docs`。

韩圈 重大产品与技术决策记录。新决策只追加到 JSON，不删改历史条目。

最后更新：**2026-06-17**

---

### 2026-06-17 · `password-reset-plan-a`

| | |
|---|---|
| **决定** | 密码方案 A：已登录改密 + 忘记密码说明页 + 人工脚本重置 |
| **原因** | 用户名登录无真实邮箱，不做 SMTP/reset token |
| **放弃方案** | recovery_email、Supabase reset email、/auth/callback |


### 2026-06-17 · `admin-dashboard-v1`

| | |
|---|---|
| **决定** | 运营 Dashboard V1：数字卡片统计，不做图表/BI |
| **原因** | 运营需要快速概览；避免复杂 SaaS 化 |
| **放弃方案** | 折线图/柱状图/地图、独立 analytics 平台 |


### 2026-06-26 · `docs-v2-ai-onboarding`

| | |
|---|---|
| **决定** | 文档体系 V2：架构/决策/AI_CONTEXT + 自动生成接手材料 |
| **原因** | 任意 AI 可在数分钟内恢复上下文 |
| **放弃方案** | 仅 README 或口头交接 |


### 2026-06-26 · `unified-share-v1`

| | |
|---|---|
| **决定** | 统一分享：Web Share API + 复制链接；OG 默认图；不做微信 SDK |
| **原因** | 轻量、跨平台；链接可打开帖子/主页 |
| **放弃方案** | 微信 SDK、邀请裂变、独立券分享页 |


### 2026-06-26 · `favorites-single-store`

| | |
|---|---|
| **决定** | 收藏状态统一由 post-store 管理；三入口乐观同步 |
| **原因** | 避免首页/详情/我的收藏不一致 |
| **放弃方案** | 各页面独立请求、无 pending 登录续流程 |


### 2026-06-17 · `coupon-bound-to-post`

| | |
|---|---|
| **决定** | 商家优惠券必须绑定发帖；帖内展示领取/剩余 |
| **原因** | 券即内容营销；用户在同一上下文领券 |
| **放弃方案** | 独立优惠券管理后台、与帖解耦的券库 |


### 2026-06-17 · `shared-profile-merchant`

| | |
|---|---|
| **决定** | 商家与普通用户共用 Profile 路由与账号体系 |
| **原因** | 一套登录/发帖/互动；商家只是 profiles + merchant_profiles 扩展 |
| **放弃方案** | 独立商家 App、双套账号 |


### 2026-06-17 · `no-merchant-saas`

| | |
|---|---|
| **决定** | 不做复杂商家后台与经营统计 SaaS |
| **原因** | 韩圈是社区不是 B 端 SaaS |
| **放弃方案** | 券分析大盘、商家独立运营台 |


### 2026-06-17 · `rls-no-service-role-frontend`

| | |
|---|---|
| **决定** | 前台只用 anon + authenticated；RLS 为安全边界 |
| **原因** | 防止权限泄露；脚本/regression 可用 service_role |
| **放弃方案** | 前台 bypass RLS、随意改 policy |


### 2026-06-17 · `server-actions-pattern`

| | |
|---|---|
| **决定** | 写操作走 lib/actions Server Actions + Supabase SSR 客户端 |
| **原因** | Next.js App Router 标准；Cookie session 一致 |
| **放弃方案** | 大量自建 REST API routes |


### 2026-06-17 · `bootstrap-regression-gate`

| | |
|---|---|
| **决定** | npm run bootstrap = 20 迁移 + build + regression 41 项 |
| **原因** | 换环境可验证；RLS 与主链路有回归网 |
| **放弃方案** | 无自动化、仅手工点测 |


### 2026-06-17 · `auth-username-email`

| | |
|---|---|
| **决定** | 用户以 username 登录；内部映射 Supabase email |
| **原因** | 华人社区习惯账号名；profiles.username 公开 |
| **放弃方案** | 强制邮箱注册为主标识 |



---

## 如何追加

```json
{
  "date": "YYYY-MM-DD",
  "id": "short-kebab-id",
  "decision": "做了什么决定",
  "reason": "为什么",
  "rejected": "考虑过但没选的方案"
}
```

插入 `project-state.json` 的 `decisions` 数组**第一项**，运行 `npm run sync-docs`。
