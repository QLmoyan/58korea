# PRODUCT_RULES

韩圈的长期产品原则。所有功能设计、Bug 修复、AI 辅助开发均须遵守。若与一次性需求冲突，以本文档为准。

## 产品定位

- **是什么**：韩国华人生活社区（探店 / 房屋 / 招聘 / 二手 / 求助 / 攻略等内容交流）
- **不是什么**：商家 SaaS、独立券平台、社交电商、IM 工具、数据统计大盘

## 核心原则

### 1. 轻量简单

- 优先「能用的闭环」，不做过度抽象与复杂配置
- 新功能默认 V1 收口：修体验、补同步、补 redirect，而非扩 scope
- UI 保持移动端优先；桌面为增强，不另起一套产品逻辑

### 2. 商家与普通用户一致体验

- 同一套账号、发帖、评论、收藏、分享、消息链路
- 商家仅多：认证标识、商家资料、**发帖时绑定优惠券**
- 不为商家单独做「另一套 App」式后台

### 3. 优惠券必须绑定发帖

- 商家优惠券通过 **发帖绑定** 发放与展示
- **不做**独立优惠券管理后台（单独 CRUD 券库、与帖解耦）
- 券在帖子详情公开展示 **领取 / 剩余** 等必要信息
- 不做隐藏库存的「神秘营销」玩法

### 4. 不做复杂商家后台

- 无独立商家运营台、无券统计大盘、无商家数据分析 SaaS
- 商家在「我的」/profile 编辑资料；券随发帖管理
- 平台运营使用现有 `/admin`（审核、举报、规则、频道文章）

### 5. 帖子与内容公开

- 已发布帖子、评论对社区可读（受 RLS 与 moderation 约束）
- 优惠券领取状态、剩余量等对用户 **公开可见**（在帖内券模块）
- 不做「仅商家可见库存」的前台逻辑

### 6. 安全与架构边界

- **不改 RLS** 乱开权限；新需求先想能否在现有 RLS 内完成
- **前台不用 `service_role`**；脚本/regression/admin 可用
- 用户数据以 Supabase Auth + profiles 为准

### 7. 登录与回流

- 未登录触发的互动（收藏、领券、发帖等）应带 **redirect** 回到原页面
- 可恢复的操作（如收藏）登录后应尽量 **自动续流程**
- 不强制微信 SDK；分享优先 Web Share API / 复制链接

### 8. 诚实 UI

- 不做「看起来能用其实没做」的按钮（关注、假数据浏览量等）
- 未实现功能要么隐藏，要么明确「后续版本」— 不允许 silent noop
- 占位数据须标注或尽快替换（如广场 Banner、浏览量）

### 9. 测试与发布

- 功能收口后：`npm run build` + `npm run regression-check` 必须通过
- 专项能力可增 `scripts/test-*-v1.ts`，但不替代 regression
- 换环境优先 `npm run bootstrap`

### 10. 文档与状态

- **`docs/project-state.json` 为单一事实来源**（模块状态、Bug、路线、Changelog、Decisions）
- 完成模块后更新 JSON 并 `npm run sync-docs`，**不要手改**生成的 MD
- 新 AI 对话按 [NEW_CHAT_GUIDE.md](./NEW_CHAT_GUIDE.md) 顺序阅读；首读 [AI_CONTEXT.md](./AI_CONTEXT.md)

## 明确不做（长期）

| 类别 | 说明 |
|---|---|
| 独立优惠券管理 | 券必须跟帖 |
| 商家统计 SaaS | 无经营大盘、无复杂报表 |
| 分享裂变 / 邀请奖励 / 积分 | 分享 V1 仅链接传播 |
| 微信 SDK 深度集成 | Web 标准能力优先 |
| 私信 / IM | 非当前阶段核心 |
| 收藏夹分类 / 标签 / 批量管理 | 收藏保持轻量 |
| 结构化租房/招聘 marketplace | 暂用分类帖子 |
| 前台 service_role | 安全红线 |

## 与代码的对应关系

| 原则 | 代码锚点 |
|---|---|
| 券绑定发帖 | `PublishCouponSettings`、`PostLinkedCouponSection`、`posts.linked_coupon_id` |
| 无独立券后台 | 无 `/merchant/coupons` 管理台；券在发帖/帖内编辑 |
| 收藏轻量 | `post_favorites` + 我的 Tab，无 folder |
| 分享轻量 | `lib/share/share-content.ts`，无邀请码 |
| RLS | `scripts/apply-*-rls*.ts`、`scripts/regression-check.ts` RLS 段 |

## 修订

- 原则变更时：**先改本文档**，再改 `project-state.json` 的 `roadmap.wontDo` / `pendingV2` / `decisions`，最后 `npm run sync-docs`
- 本文档由人维护；`AI_CONTEXT` / `PROJECT_STATUS` / `ROADMAP` / `CHANGELOG` / `DECISIONS` 由脚本生成
