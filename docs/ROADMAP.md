# ROADMAP

> 自动生成文件。请勿手改。更新 `docs/project-state.json` 后运行 `npm run sync-docs`。

最后更新：**2026-06-17** · 当前版本 `0.1.0` · 下一目标 `0.2.0`

## 已完成（近期收口）

- ✅ **运营 Dashboard V1** (`admin-dashboard-v1`)
- ✅ **项目 Bootstrap V1** (`bootstrap-v1`)
- ✅ **账号与资料 V1** (`auth-profile-v1`)
- ✅ **优惠券全链路 V1** (`coupons-v1`)
- ✅ **发帖体验 V1** (`publish-v1`)
- ✅ **收藏系统收口 V1** (`favorites-v1`)
- ✅ **统一分享系统 V1** (`share-v1`)
- ✅ **移动端体验收口 V1** (`mobile-ux-v1`)

## P1 — 优先（信任与账号基础）

- ⏳ **消除假功能误导** (`honest-ui-v2`)
- ⏳ **我的评论 Tab 补全** (`profile-comments-v2`)

## P2 — 运营与体验补全

- ⏳ **系统通知 Tab 落地** (`system-notifications-v2`)
- ⏳ **广场 Banner 可运营** (`square-banners-v2`)
- ⏳ **Admin 管理员管理页** (`admin-admins-v2`)
- ⏳ **登录 redirect 剩余入口收口** (`login-redirect-v2`)

## P3 — polish / 工程

- ⏳ **「附近」产品定义** (`nearby-feed-v2`)
- ⏳ **database.types.ts 同步** (`types-sync-v2`)
- ⏳ **自定义 404 / error 页** (`global-error-pages`)

## 暂缓（Deferred）

- **用户私信** (`dm-chat`) — 非当前轻量社区阶段核心
- **完整关注社交图谱** (`follow-graph`) — 需独立数据模型，暂缓
- **结构化租房/招聘市场** (`structured-marketplace`) — 保持通用帖子 + 分类

## 不要开发（Won't Do）

- ❌ **独立商家优惠券后台** (`standalone-coupon-admin`) — 券必须绑定发帖
- ❌ **商家统计 SaaS 大盘** (`merchant-stats-saas`) — 产品保持轻量
- ❌ **分享裂变 / 邀请奖励 / 积分** (`share-rewards`) — 分享 V1 已做，裂变明确不做
- ❌ **微信 SDK 特殊分享** (`wechat-sdk`) — 优先 Web Share / 复制链接
- ❌ **前台使用 service_role** (`rls-bypass`) — 安全原则

## 维护说明

每完成一个模块：

1. 编辑 `docs/project-state.json`（completed / changelog / bugs / roadmap / version）
2. 重大产品决策追加到 `decisions` 数组顶部
3. 运行 `npm run sync-docs`
4. 按需运行 `npm run build` 与 `npm run regression-check`，将结果写回 JSON
