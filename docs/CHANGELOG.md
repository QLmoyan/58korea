# CHANGELOG

> 自动生成文件。请勿手改。更新 `docs/project-state.json` 后运行 `npm run sync-docs`。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。当前主版本：**0.1.0**（Late Beta / 早期生产）。

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
