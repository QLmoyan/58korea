# PROJECT_ARCHITECTURE

> 说明 **架构与模块关系**，不是功能清单。功能状态见 [PROJECT_STATUS.md](./PROJECT_STATUS.md)。

最后更新：**2026-06-26**

---

## 1. 整体架构

韩圈是 **Next.js App Router 全栈应用**：浏览器 React 客户端 + Server Actions / Server Components，数据持久化在 **Supabase**（Auth + Postgres + Storage + RLS）。

### 1.1 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 16 · React 19 · TypeScript |
| 样式 | Tailwind CSS 4 |
| 后端 | Supabase Auth · Postgres · Storage |
| 写操作 | `lib/actions/*` Server Actions + SSR Supabase 客户端 |
| 读操作 | Server Components 直查 + 客户端 Store 缓存 |

### 1.2 数据主链（Supabase）

身份与内容沿一条链扩展，**不是**多套独立系统：

```
Supabase Auth (session / JWT)
        ↓
    profiles          ← 所有用户的公开资料（username、昵称、头像）
        ↓
 merchant_profiles    ← 可选扩展：商家认证、店名、地址等（仍同一 user_id）
        ↓
      posts            ← 社区内容；商家帖可绑定券
        ↓
 merchant_coupons     ← 券定义（总量、过期、核销规则）；1 帖 1 券
        ↓
  user_coupons         ← 用户领取记录 + 核销码
        ↓
 notifications        ← 评论/点赞/券相关等站内通知
```

**关系说明：**

| 节点 | 职责 | 与上下游 |
|---|---|---|
| **Auth** | 登录态、user_id | 注册/登录后写入 `profiles` |
| **profiles** | 社区身份 | 发帖 author、搜索用户、公开主页 `/profile/[username]` |
| **merchant_profiles** | 商家扩展 | 同一 profile 加认证；Feed 排序可优先商家帖 |
| **posts** | 内容单元 | 评论、点赞、收藏、浏览、分享均围绕帖 |
| **merchant_coupons** | 券模板 | **必须**关联某 post_id；无独立券库 |
| **user_coupons** | 领取实例 | 用户领券、商家核销 |
| **notifications** | 消息中心 | 由互动与券事件写入；非 IM |

辅助表（未画在主链上）：`post_images`、`comments`、`post_likes`、`post_favorites`、`post_views`、`reports`、`admin_users`、`channel_articles` 等，均挂在 posts / profiles 周围。

### 1.3 请求路径（简化）

```
Browser
  → App Router (page / layout)
  → Client Store（缓存、乐观 UI）或 Server Component（首屏）
  → lib/actions/*（写） / lib/supabase/*（读）
  → Supabase（RLS 过滤）
```

**安全边界：** 前台仅 `anon` + `authenticated` 客户端；**不用** `service_role`。迁移脚本与 `regression-check` 可用 service role。

---

## 2. 页面结构

路由在 `app/`。页面之间是 **同一套导航 + Store**，不是多个子产品。

```
                    ┌─────────────┐
                    │  Feed (/)   │  推荐 / 附近 / 关注 Tab
                    └──────┬──────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌────────────┐
    │ posts/[id] │  │  Search    │  │  Square    │
    │  帖子详情   │  │  /search   │  │  /square   │
    └──────┬─────┘  └────────────┘  └──────┬─────┘
           │                                │
           │         ┌────────────┐         ▼
           └────────►│ Profile    │   channels/*
                     │ /profile   │
                     └──────┬─────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
       profile/[u]   merchants/[u]   publish
       公开主页        商家主页         发帖

    ┌────────────┐              ┌────────────┐
    │  Message   │              │   Admin    │
    │ /messages  │              │  /admin    │
    └────────────┘              └────────────┘
```

| 区域 | 路由 | 依赖 |
|---|---|---|
| **Feed** | `/` | post-store 列表；merchant-store 排序/标识 |
| **帖子详情** | `/posts/[id]` | post-store + 券组件 + 分享/收藏 |
| **Profile** | `/profile`、`/profile/[username]`、`/profile/edit` | auth-store + post-store（我的帖/收藏/历史） |
| **Merchant** | `/merchants/[username]` | merchant-store + 商家券列表 |
| **Search** | `/search` | search-store（独立 Provider，按需挂载） |
| **Message** | `/messages` | Supabase notifications 直查 |
| **Admin** | `/admin/*` | admin_users + 审核/举报/频道 CMS |
| **频道** | `/channels`、`/square` | 运营文章，与 UGC 帖并行 |

**登录/注册：** `/login`、`/register` — 带 `redirect` 回跳（见 `lib/auth/redirect.ts`）。

---

## 3. Store 与数据来源

Provider 嵌套顺序（`components/providers/AppProviders.tsx`）：

```
ImageViewerProvider
  → AuthProvider
    → MerchantStoreProvider
      → PostStoreProvider
```

### 3.1 各 Store 存什么

| Store | 文件 | 内存状态 | 主要 Supabase 来源 |
|---|---|---|---|
| **auth-store** | `lib/store/auth-store.tsx` | `user`、`profile`、loading | Auth session、`profiles` |
| **post-store** | `lib/store/post-store.tsx` | Feed 帖、评论、点赞/收藏 ID、收藏列表、浏览历史 | `posts`、`comments`、`post_*` 互动表 |
| **merchant-store** | `lib/store/merchant-store.tsx` | 活跃商家摘要列表 | `merchant_profiles` |
| **search-store** | `lib/store/search-store.tsx` | 搜索词、结果、高亮 | 搜索查询（帖/用户/商家） |
| **desktop-post-modal-store** | `lib/store/desktop-post-modal-store.tsx` | 桌面弹窗打开的帖 ID | 复用 post-store |
| **image-viewer-store** | `lib/store/image-viewer-store.tsx` | 全屏看图状态 | Storage URL（无独立表） |

**post-store 是核心：** Feed、详情、收藏、点赞、发帖、删帖、评论均经此 Store，保证三端（首页 / 详情 / 我的）状态一致。

### 3.2 Local / Session（非 Supabase）

| 位置 | 用途 |
|---|---|
| `lib/local/owned-content.ts` | 本机标记「我发的帖/评论」以便删改（配合 RLS） |
| `lib/local/reporter-key.ts` | 匿名举报设备键 |
| `sessionStorage` 发帖草稿 | `lib/publish/publish-draft.ts` |
| `sessionStorage` pending 收藏 | `lib/engagement/pending-favorite.ts` — 登录后续收藏 |

退出登录时 `clearUserSessionLocalData` 清理上述与用户相关的 local 状态。

### 3.3 不经 Store 的数据

- **消息页**：页面级 fetch notifications
- **Admin**：Server Components + actions
- **频道文章**：独立查询，不进入 post-store

---

## 4. 为什么这么设计

### 4.1 商家与普通用户共用 Profile

- **一套账号**即可发帖、评论、收藏、领券；商家只是 `profiles` + `merchant_profiles` 扩展。
- 避免「商家 App / 用户 App」双轨开发与双套登录。
- 公开主页 `/profile/[username]` 与商家页 `/merchants/[username]` 共享同一 user_id，仅展示侧重不同。

### 4.2 优惠券绑定帖子

- 券是 **内容营销**，不是独立电商 SKU。
- 用户在读帖上下文领券，商家在发帖时创建/绑定券，闭环简单。
- 帖内公开展示领取数/剩余，符合社区透明原则（见 [PRODUCT_RULES.md](./PRODUCT_RULES.md)）。

### 4.3 不做独立优惠券后台

- 无「券库 CRUD + 再选帖挂载」— 减少商家认知负担与工程 scope。
- 运营审核仍走 `/admin` 内容安全，不对券做 B 端 SaaS 报表。

### 4.4 为什么不用复杂 SaaS

- 定位是 **韩国华人生活社区**，不是商家经营分析平台。
- 功能优先级：能用的发帖 / 互动 / 领券闭环 > 大盘 / 漏斗 / 私域 CRM。
- 复杂 SaaS 会牵引 RLS、权限、UI 全面膨胀，与「轻量 V1 收口」冲突。

### 4.5 其他架构选择（摘要）

| 选择 | 原因 |
|---|---|
| Server Actions 而非大量 API Routes | App Router 惯例；Cookie session 一致 |
| Client Store 缓存 Feed | 移动端体验；乐观更新收藏/点赞 |
| username 登录 | 社区习惯；内部映射 Supabase email |
| bootstrap + regression 41 项 | 换环境可验证 RLS 与主链路 |

重大产品决策的日期与「放弃方案」见 [DECISIONS.md](./DECISIONS.md)（由 `project-state.json` 同步生成）。

---

## 5. 相关文档

- [AI_CONTEXT.md](./AI_CONTEXT.md) — AI 首次接手必读（短）
- [PRODUCT_RULES.md](./PRODUCT_RULES.md) — 产品铁律
- [project-state.json](./project-state.json) — 模块与版本单一事实来源
