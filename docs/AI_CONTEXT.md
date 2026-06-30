# AI_CONTEXT

> **任何 AI 第一次接手 韩圈 必须先读本文档。** 自动生成，勿手改。来源：`docs/project-state.json` · 最后更新 **2026-06-17**

---

## 1. 一句话

**韩圈** 是面向在韩华人的 **轻量生活社区**（探店、房屋、招聘、二手、求助、攻略），Next.js + Supabase，当前 v0.3.0-dev / Place Hub 阶段。

## 2. 产品定位

- **是**：UGC 社区、商家帖内发券、站内通知、频道运营文章、移动端优先
- **不是**：商家 SaaS、独立券平台、IM 私信、分享裂变、经营数据大盘

详见 [PRODUCT_RULES.md](./PRODUCT_RULES.md)。

## 3. 当前开发阶段

**v0.3.0-dev / Place Hub 阶段** — V1 主链路已收口；当前以 **V2 体验债与诚实 UI** 为主，不扩 scope。

## 4. 当前版本

- **Current Version**：`0.3.0-dev`
- **Next Version（目标）**：`0.3.0`
- **Build**：PASS（2026-06-17）
- **Regression**：PASS 67/67（2026-06-17）

## 5. Current Focus

- Chat V1
- Post Edit V1

## 6. 产品铁律（不可违背）

1. **券必须绑定发帖** — 无独立优惠券后台
2. **商家与用户同一套 Profile / 登录** — 无复杂商家运营台
3. **不改 RLS 乱开权限** — 前台不用 `service_role`
4. **诚实 UI** — 无假按钮、假数据（浏览量/关注等正在清理）
5. **未登录操作带 redirect** — 收藏等可登录后续流程
6. **收口后** `npm run build` + `npm run regression-check` 必须通过
7. **完成模块** 必须更新 `project-state.json` 并 `npm run sync-docs`

## 7. 已完成模块（摘要）

密码方案 A、运营 Dashboard V1、项目 Bootstrap V1、首页 Feed V1、帖子与评论 V1、账号与资料 V1、搜索 V1、商家体系 V1、优惠券全链路 V1、发帖体验 V1 等共 29 项（完整见 PROJECT_STATUS）

完整列表与 Bug 见 [PROJECT_STATUS.md](./PROJECT_STATUS.md)。

## 8. 不要建议开发

以下与产品方向冲突，**不要主动提议**（除非用户明确要求）：

- 独立商家优惠券后台 — 券必须绑定发帖
- 商家统计 SaaS 大盘 — 产品保持轻量
- 分享裂变 / 邀请奖励 / 积分 — 分享 V1 已做，裂变明确不做
- 微信 SDK 特殊分享 — 优先 Web Share / 复制链接
- 前台使用 service_role — 安全原则

暂缓（非永久禁止，但非当前重点）：

- 用户私信 — 非当前轻量社区阶段核心
- 完整关注社交图谱 — 需独立数据模型，暂缓
- 结构化租房/招聘市场 — 保持通用帖子 + 分类

- 复杂商家后台与统计报表
- 用户私信 / IM
- 完整关注社交图谱与关注 Feed

## 9. 接下来读什么

按 [NEW_CHAT_GUIDE.md](./NEW_CHAT_GUIDE.md) 顺序继续：

PRODUCT_RULES → PROJECT_STATUS → ROADMAP → CHANGELOG → PROJECT_ARCHITECTURE → DECISIONS

## 10. 关键命令

```bash
npm run dev
npm run build
npm run regression-check
npm run sync-docs      # 更新 JSON 后同步文档
npm run bootstrap      # 新环境：migrate + build + regression
```

单一事实来源：**`docs/project-state.json`**
