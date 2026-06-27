# PROJECT_STATUS

> 自动生成文件。请勿手改。更新 `docs/project-state.json` 后运行 `npm run sync-docs`。

最后更新：**2026-06-17**

## 快照

| 项 | 值 |
|---|---|
| **Current Version** | `0.1.0` |
| **Next Version** | `0.2.0` |
| **Development Stage** | Late Beta / 早期生产 |
| **Build** | **PASS**（2026-06-17） |
| **Regression** | **PASS** 48/48（2026-06-17） |

## Current Focus

- 消除假功能误导（关注按钮、关注 Tab）
- 我的评论 Tab 全量查询

验证命令：`npm run build` · `npm run regression-check`

## 产品与技术

- **产品**：58korea（韩国华人生活社区）
- **技术栈**：Next.js 16 · React 19 · Supabase · Tailwind 4

## 已完成模块（V1）

- **密码方案 A** (`password-reset-v1`) — 已登录改密、/forgot-password 说明页、人工 reset-user-password 脚本；改密成功文案对齐 session
- **运营 Dashboard V1** (`admin-dashboard-v1`) — 后台数字卡片：用户/内容/商家/券/运营统计；DAU/WAU/MAU 行为去重
- **项目 Bootstrap V1** (`bootstrap-v1`) — 一键 migrate + build + regression；部署清单
- **首页 Feed V1** (`home-feed-v1`) — 推荐/附近/关注 Tab、分类筛选、双列瀑布流、移动端 + 桌面
- **帖子与评论 V1** (`posts-comments-v1`) — 发帖、详情、评论、评论图片、点赞、浏览记录
- **账号与资料 V1** (`auth-profile-v1`) — 注册/登录/资料编辑、公开主页、redirect 收口
- **搜索 V1** (`search-v1`) — 帖子/用户/商家搜索与高亮
- **商家体系 V1** (`merchant-v1`) — 商家主页、认证标识、资料编辑、公开券列表
- **优惠券全链路 V1** (`coupons-v1`) — 发帖绑定券、领取、核销、过期、删券通知；Bugfix V1
- **发帖体验 V1** (`publish-v1`) — 草稿、sticky 发布栏、券/图校验、失败保留草稿
- **收藏系统收口 V1** (`favorites-v1`) — 三处同步、乐观更新、登录续收藏、删帖清理
- **统一分享系统 V1** (`share-v1`) — navigator.share / 复制链接、OG metadata、四类页面分享
- **消息中心 V1** (`messages-v1`) — 评论/回复/点赞通知、未读数、已读
- **频道与广场 V1** (`channels-v1`) — Square 模块、频道文章、Markdown 详情
- **内容安全与运营后台 V1** (`moderation-admin-v1`) — 审核/举报/规则/频道 CMS、前台管理员能力
- **移动端体验收口 V1** (`mobile-ux-v1`) — Loading 超时、LAN 访问、券/发帖移动端优化

## 待优化模块（V2）

- **消除假功能误导** (`honest-ui-v2`) — 关注按钮、关注 Tab — 隐藏或接最小实现
- **我的评论 Tab 补全** (`profile-comments-v2`) — 按 user_id 查全量评论，非 session 片段
- **系统通知 Tab** (`system-notifications-v2`) — 利用现有 notifications 表与券到期 cron
- **广场 Banner 可运营** (`square-banners-v2`) — 替换 lib/square/banners.ts 硬编码
- **Admin 管理员管理页** (`admin-admins-v2`) — 补 /admin/admins，消除死链
- **登录 redirect 剩余入口** (`login-redirect-v2`) — 消息页、桌面侧栏等入口统一 buildLoginHref
- **「附近」产品定义** (`nearby-feed-v2`) — 改文案或接真实定位，避免随机 distance 误导
- **database.types.ts 同步** (`types-sync-v2`) — admin_users 等 schema 与类型文件对齐

## 未开始模块

- **用户私信 / IM** (`dm-chat`) — 无表、无 UI
- **用户关注关系与关注 Feed** (`follow-graph`) — 当前 following 字段非真实关注
- **商家导航/打车/公交** (`merchant-nav`) — merchant-navigation 页为 stub
- **搭子独立品类** (`buddy-category`) — PRODUCT.md 有描述，代码映射到「其他」
- **租房/招聘结构化表单** (`structured-marketplace`) — 当前为通用帖子 + 分类
- **分享裂变 / 邀请奖励** (`share-rewards`) — 明确不做，留 V2+ 以后评估
- **PWA / 多语言** (`pwa-i18n`) — 未规划实现

## 当前 Bug / 体验债

- **[medium]** `follow-button-noop` — PostDetailTopBar「关注作者」按钮无 onClick / 无 API
- **[low]** `follow-tab-misleading` — 首页「关注」Tab 依赖 post.following 字段，用户发帖恒为 false
- **[low]** `admin-admins-404` — AdminDashboard 链接 /admin/admins 但路由不存在
- **[low]** `emoji-stub` — 评论 Emoji 按钮仍为「功能开发中」
- **[low]** `system-notifications-empty` — 消息中心系统 Tab 空态，文案「后续版本开放」
- **[low]** `square-banners-static` — 广场 Banner 硬编码 picsum 链接
- **[low]** `profile-comments-partial` — 我的页评论 Tab 仅 session 内已加载评论 + local owned IDs

## 建议下一步

- 消除假功能误导（关注按钮、关注 Tab）
- 我的评论 Tab 全量查询

## 相关文档

- [AI_CONTEXT.md](./AI_CONTEXT.md) — AI 首次接手（短）
- [PRODUCT_RULES.md](./PRODUCT_RULES.md) — 产品长期原则
- [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md) — 架构与 Store
- [DECISIONS.md](./DECISIONS.md) — 重大产品决策
- [ROADMAP.md](./ROADMAP.md) — 优先级路线
- [CHANGELOG.md](./CHANGELOG.md) — 版本变更记录
- [NEW_CHAT_GUIDE.md](./NEW_CHAT_GUIDE.md) — 新对话阅读顺序
- [deployment-checklist.md](./deployment-checklist.md) — 部署清单
