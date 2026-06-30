# PROJECT_STATUS

> 自动生成文件。请勿手改。更新 `docs/project-state.json` 后运行 `npm run sync-docs`。

最后更新：**2026-06-17**

## 快照

| 项 | 值 |
|---|---|
| **Current Version** | `0.3.0-dev` |
| **Next Version** | `0.3.0` |
| **Development Stage** | v0.3.0-dev / Place Hub 阶段 |
| **Build** | **PASS**（2026-06-17） |
| **Regression** | **PASS** 67/67（2026-06-17） |

## Current Focus

- Chat V1
- Post Edit V1

验证命令：`npm run build` · `npm run regression-check`

## 产品与技术

- **产品**：韩圈（韩国华人生活社区）
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
- **我的评论 Tab V2** (`profile-comments-v2`) — 按 user_id 查 published 评论、批量关联帖子标题、分页加载更多
- **Honest UI V2** (`honest-ui-v2`) — 移除假关注按钮/Tab、停用 nearby/following 筛选、Feed 改为推荐/最新、前台不展示 distance
- **System Notifications V2** (`system-notifications-v2`) — 消息中心系统 Tab 查询 notifications.type=system；券到期/下架等真实系统通知；诚实空态
- **Square Banners V2** (`square-banners-v2`) — square_banners 表 + Admin 广场 Banner Tab；发现页轮播读库，无硬编码 picsum
- **Admin Admins V2** (`admin-admins-v2`) — /admin/admins 只读管理员列表；admins.manage 门禁；消除 Dashboard 死链
- **Login Redirect V2** (`login-redirect-v2`) — 消息页/桌面侧栏/发帖/领券等入口统一 buildLoginHref；resolveRedirectTarget 防开放跳转
- **Types Sync V2** (`types-sync-v2`) — database.types.ts 补齐 admin_users；移除 as never 绕过；notifications/square_banners 与 schema 对齐
- **Global Error Pages** (`global-error-pages`) — 自定义 not-found / error / global-error；韩圈风格文案，不暴露技术细节
- **v0.2.0 Release Check** (`v0.2.0-release-check`) — build + regression 60/60 PASS；无用户可见旧品牌/假关注/裸 login；package.json 对齐 0.2.0
- **Nearby Lite V1** (`nearby-lite-v1`) — 恢复附近 Tab：按用户选择地区匹配 post.location；hanquan:selected-region；无 GPS/假距离
- **Nearby Auto Region V1** (`nearby-auto-region-v1`) — 附近 Tab 自动 geolocation 映射地区；hanquan:location-mode auto/manual；不写经纬度入库
- **Publish Location UX V1** (`publish-location-v1`) — 发帖页移除自由输入；post.location 仅来自自动定位或 Bottom Sheet 选区；定位失败不阻塞页面
- **Search Context MVP** (`search-context-mvp`) — 搜索继承首页 Tab/地区上下文；地点词典解析；无 AI/无 Store/无假距离

## 待优化模块（V2）



## 未开始模块

- **用户私信 / IM** (`dm-chat`) — 无表、无 UI
- **用户关注关系与关注 Feed** (`follow-graph`) — 当前 following 字段非真实关注
- **商家导航/打车/公交** (`merchant-nav`) — merchant-navigation 页为 stub
- **搭子独立品类** (`buddy-category`) — PRODUCT.md 有描述，代码映射到「其他」
- **租房/招聘结构化表单** (`structured-marketplace`) — 当前为通用帖子 + 分类
- **分享裂变 / 邀请奖励** (`share-rewards`) — 明确不做，留 V2+ 以后评估
- **PWA / 多语言** (`pwa-i18n`) — 未规划实现

## 当前 Bug / 体验债

- **[low]** `emoji-stub` — 评论 Emoji 按钮仍为「功能开发中」

## 建议下一步

- 消除假功能误导（关注按钮、关注 Tab）

## 相关文档

- [AI_CONTEXT.md](./AI_CONTEXT.md) — AI 首次接手（短）
- [PRODUCT_RULES.md](./PRODUCT_RULES.md) — 产品长期原则
- [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md) — 架构与 Store
- [DECISIONS.md](./DECISIONS.md) — 重大产品决策
- [ROADMAP.md](./ROADMAP.md) — 优先级路线
- [CHANGELOG.md](./CHANGELOG.md) — 版本变更记录
- [NEW_CHAT_GUIDE.md](./NEW_CHAT_GUIDE.md) — 新对话阅读顺序
- [deployment-checklist.md](./deployment-checklist.md) — 部署清单
