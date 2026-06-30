# CHANGELOG

> 自动生成文件。请勿手改。更新 `docs/project-state.json` 后运行 `npm run sync-docs`。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。当前主版本：**0.3.0-dev**（v0.3.0-dev / Place Hub 阶段）。

## [0.3.0-dev] Chat V1 — 2026-06-17

- chat_conversations / chat_messages / chat_user_blocks 表 + RLS
- 任意登录用户可私信，无互关/好友申请门槛
- getOrCreateConversation、发消息、拉取会话与消息 Server Actions
- 用户主页「发消息」→ /messages/chat/{id}；收件箱合并真实聊天会话
- 未读 = 对方发送且 is_read=false；regression 1.6x；build/regression PASS

## [0.3.0-dev] Messages Inbox V1 — 2026-06-17

- /messages 重做：顶部通讯录/系统通知入口 + 会话列表
- notifications 聚合为系统通知、评论和回复、收到的赞三类会话
- 头像/昵称摘要/时间/未读数；点击进入对应通知详情列表
- 无私信表、无假好友/假聊天；通讯录诚实空态「暂无联系人」
- regression 1.6w；build/regression PASS

## [0.3.0-dev] Merchant Apply V1 — 2026-06-17

- merchant_applications 表 + RLS：用户仅可查看/创建自己的申请
- merchant_profiles 新增 category / is_verified；公开商家需 is_verified
- /merchant/apply 申请表单；我的页展示认证/审核中/被拒/可申请状态
- Admin「商家认证」Tab：列表、详情、通过/拒绝
- 通过 upsert merchant_profiles.is_verified=true；审核结果写入 system 通知
- regression 1.6t；build/regression PASS

## [0.3.0-dev] Search Context MVP — 2026-06-17

- parseSearchContext：地点词典 + 首页 Tab/地区上下文
- query-place / nearby-context / global-recommend / global-latest 四种来源
- 搜索页展示 displayLabel；首页搜索带 channel/region 参数
- 帖子/商家按 place 过滤 location/address；最新 Tab 按时间排序
- 无 AI、无 Store/POI、无假距离；regression 1.6s；build/regression 63/63 PASS

## [0.2.2] Nearby Auto Region V1 + Publish Location UX — 2026-06-17

- 点击「附近」Tab 时自动 geolocation 映射地区（首尔/釜山/京畿等粗略范围）
- hanquan:location-mode auto/manual；手动选择不被自动覆盖
- 定位失败 fallback 手动选择；不写经纬度到 Supabase
- 发帖页移除地区自由输入；PublishLocationSection + RegionPickerSheet
- post.location 仅来自 resolvePublishLocation(region)；无 location 时阻止发布并提示
- localStorage 仅 hanquan:selected-region / hanquan:location-mode
- regression 1.6r（含 PublishForm 静态检查）；build/regression 62/62 PASS

## [0.2.1] Nearby Lite V1 — 2026-06-17

- 首页 Feed 恢复「推荐 / 附近 / 最新」；附近按 post.location 匹配用户选择地区
- 地区选择器 + localStorage hanquan:selected-region，默认首尔
- 发帖可选地区/位置文案；不显示 m/km 假距离、不接 GPS
- regression 1.6q；build/regression PASS

## [0.2.0] v0.2.0 Release — 2026-06-17

- 发布前检查：build + regression 60/60 PASS
- 用户可见面无 58korea/58韩国、假关注 Tab、square picsum、裸 /login
- /admin/admins、not-found、error 页就绪；admin_users 类型无 as never
- knownBugs 仅保留 emoji-stub；package.json 版本升至 0.2.0

## [0.2.0] Global Error Pages — 2026-06-17

- 新增 app/not-found.tsx：页面走丢了｜韩圈，返回首页 / 去发现
- 新增 app/error.tsx：友好错误页，重试 + 返回首页，console.error 记录
- 新增 app/global-error.tsx：根布局级错误兜底
- regression 1.6p；build/regression PASS

## [0.2.0] Types Sync V2 — 2026-06-17

- database.types.ts 补齐 admin_users（id/user_id/role/enabled/created_at/updated_at）
- 移除 admin_users 相关 as never 绕过；load-admin-membership / admin-admins 使用真实类型
- 核对 square_banners、notifications（含 system、可空 post_id/comment_id）与 migrations 一致
- regression 1.6o；build/regression PASS

## [0.2.0] Login Redirect V2 — 2026-06-17

- 消息页、桌面侧栏、发帖、领券等入口统一 buildLoginHref / buildLoginHrefFromPath
- 移除裸 href="/login" 与手写 encodeURIComponent redirect
- resolveRedirectTarget 拒绝外部 URL 与 /login、/register 循环
- regression 1.6n；build/regression PASS

## [0.2.0] Admin Admins V2 — 2026-06-17

- 新增 /admin/admins 只读管理员列表页，消除 Dashboard 死链
- 展示账号、角色、启用状态、权限摘要、创建/更新时间
- 仅 owner（admins.manage）可访问；变更说明指向 create-admin-user 脚本
- regression 1.6m + 2.7b；build/regression PASS

## [0.2.0] Square Banners V2 — 2026-06-17

- 新增 square_banners 表与 RLS；发现页轮播读库（is_active + sort_order）
- 移除 lib/square/banners.ts 硬编码 picsum；无启用 Banner 时不显示轮播区
- Admin「广场 Banner」Tab：列表/新增/编辑/启用/删除/排序（image_url 文本配置）
- regression 1.6l + RLS square_banners；build/regression PASS

## [0.2.0] System Notifications V2 — 2026-06-17

- 系统 Tab 查询 notifications.type=system（券到期提醒、优惠券已失效等）
- 诚实空态「暂无系统通知」；系统通知点击标记已读、无假跳转
- 系统 Tab 支持全部已读；regression 1.6k
- build + regression PASS

## [0.2.0] Honest UI V2 — 2026-06-17

- 移除帖子详情假「关注作者」按钮
- 首页 Feed Tab 改为「推荐 / 最新」，移除关注 Tab 与 nearby/following 假筛选
- PostCard 不再展示 distance；发帖不再随机写入距离
- regression 1.6j + build/regression PASS

## [0.1.0] 我的评论 Tab V2 — 2026-06-17

- 按 comments.user_id 查询 published 评论，created_at DESC，每页 20 条
- 批量关联帖子标题与 /posts/{id} 跳转；原帖不可见时显示「原帖已删除」
- regression 1.6h/1.6i + scripts/test-profile-comments-v2.ts
- build + regression 50/50 PASS

## [0.1.0] 隐藏帖子详情假浏览量 — 2026-06-17

- 移除 CommentSection 底部假浏览量（likes + 评论*5 公式）
- post_views 写入、浏览历史、Dashboard DAU 统计不变
- regression 1.6g 防止假浏览量回归
- build + regression 48/48 PASS

## [0.1.0] Feed 返回后图片高度修复 — 2026-06-17

- loadPostImagesForPost 不再用 post_images.height 覆盖 post.imageHeight
- regression 1.6f 防止 Feed 布局高度被详情页污染
- build + regression 47/47 PASS

## [0.1.0] 密码改密成功文案修正 — 2026-06-17

- 改密成功提示对齐 session 行为：当前设备可继续，其他设备用新密码登录
- build + regression 46/46 PASS

## [0.1.0] 密码方案 A — 2026-06-17

- 资料编辑页已登录修改密码（校验当前密码）
- 登录页「忘记密码？」→ /forgot-password 诚实说明页
- scripts/reset-user-password.ts 人工重置 SOP
- scripts/test-change-password-v1.ts + regression 46/46 PASS

## [0.1.0] Dashboard 活跃用户文案收口 — 2026-06-17

- DAU/WAU/MAU 说明与 tooltip 对齐实现：已登录浏览、不含搜索
- build + regression 42/42 PASS

## [0.1.0] Dashboard 审计收口 — 2026-06-17

- 隐藏「今日搜索」卡片（无搜索日志数据源，不再显示「暂无」）
- 「已认证商家」保持 is_active 口径与命名
- build + regression 42/42 PASS

## [0.1.0] 运营 Dashboard V1 — 2026-06-17

- 后台新增 Dashboard Tab（数字卡片，无图表）
- 用户 DAU/WAU/MAU 按登录/浏览/发帖/评论/收藏/点赞/领券/核销去重
- 商家活跃、券发布/领取/核销、待审帖/待处理举报统计
- 新增 dashboard.read 权限与 scripts/test-admin-dashboard-v1.ts
- regression 42/42 PASS

## [0.1.0] 文档体系 V2 — 2026-06-26

- 新增 PROJECT_ARCHITECTURE.md、DECISIONS.md、AI_CONTEXT.md
- 升级 NEW_CHAT_GUIDE 阅读顺序
- PROJECT_STATUS 增加 Current Focus / Next Version 快照
- sync-docs 自动生成 AI_CONTEXT.md

## [0.1.0] 项目管理文档体系 — 2026-06-26

- docs/project-state.json 单一事实来源
- PROJECT_STATUS / ROADMAP / CHANGELOG 由 npm run sync-docs 自动生成
- PRODUCT_RULES.md、NEW_CHAT_GUIDE.md、docs/README.md
- .cursor/rules/project-documentation.mdc 约束 AI 自动维护

## [0.1.0] 收藏系统收口 V1 — 2026-06-26

- 收藏三处实时同步：首页、详情、我的收藏
- 乐观更新 + engagement 就绪前禁用误操作
- 未登录收藏 → 登录 → 回帖自动收藏
- 删帖清理本地 favorites/likes/history
- 新增 scripts/test-favorites-v1.ts

## [0.1.0] 统一分享系统 V1 — 2026-06-26

- 统一 shareContent：navigator.share 或复制链接
- 帖子/主页/帖内券分享入口
- Open Graph + Twitter 卡片 metadata
- app/opengraph-image.tsx 默认分享图
- 新增 scripts/test-share-v1.ts

## [0.1.0] 账号与登录体验收口 V1 — 2026-06-17

- redirect 全链路：登录/注册/我的页/领券/发帖
- 退出清理 owned-content 与发帖草稿
- 登录/注册 sticky 提交栏 + pb-safe
- lib/auth/redirect.ts、session-cleanup.ts

## [0.1.0] 发帖体验收口 V1 — 2026-06-17

- sessionStorage 发帖草稿
- sticky 发布栏、券/图校验
- 发布失败保留草稿，成功跳转详情

## [0.1.0] 优惠券 Bugfix V1 — 2026-06-17

- 8 位数字核销码、过期不可领
- 领券数刷新、删券通知
- apply-coupon-bugfix-v1 迁移

## [0.1.0] 移动端真实链路收口 V1 — 2026-06-17

- 首页/消息/我的 loading 超时
- syncPostById 直链详情
- 券流程移动端触控优化

## [0.1.0] 项目 Bootstrap V1 — 2026-06-17

- npm run bootstrap：20 个 apply 脚本 + build + regression
- docs/deployment-checklist.md
- .env.local.example

## 维护说明

新增模块时在 `docs/project-state.json` → `changelog` 数组**顶部**插入一条记录。若该模块代表一个可发布里程碑，同步更新 `version` 并将 `nextVersion` 设为下一目标，然后运行 `npm run sync-docs`。
