# NEW_CHAT_GUIDE

**目标：用户不必再口头解释项目。** 任意新 AI 对话（Cursor、ChatGPT、Claude 等）按下列顺序阅读即可恢复上下文。

---

## AI 第一步：按顺序阅读

```
AI_CONTEXT.md
        ↓
PRODUCT_RULES.md
        ↓
PROJECT_STATUS.md
        ↓
ROADMAP.md
        ↓
CHANGELOG.md
        ↓
PROJECT_ARCHITECTURE.md
        ↓
DECISIONS.md
```

| 顺序 | 文件 | 作用 |
|:---:|---|---|
| 1 | [AI_CONTEXT.md](./AI_CONTEXT.md) | 2–3 页速览：定位、版本、Focus、铁律、勿建议项 |
| 2 | [PRODUCT_RULES.md](./PRODUCT_RULES.md) | 长期产品原则（不可违背） |
| 3 | [PROJECT_STATUS.md](./PROJECT_STATUS.md) | 版本、Build/Regression、模块、Bug（自动生成） |
| 4 | [ROADMAP.md](./ROADMAP.md) | P1/P2/P3、已完成、暂缓、不做（自动生成） |
| 5 | [CHANGELOG.md](./CHANGELOG.md) | 按版本变更记录（自动生成） |
| 6 | [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md) | 架构、数据链、页面、Store、设计原因 |
| 7 | [DECISIONS.md](./DECISIONS.md) | 重大决策与放弃方案（自动生成） |

需要细节时查：**[`project-state.json`](./project-state.json)**（单一事实来源）、[`deployment-checklist.md`](./deployment-checklist.md)。

---

## 本地开发（速查）

```bash
npm run dev              # http://localhost:3000
npm run build
npm run regression-check
npm run sync-docs        # 改 project-state.json 后
npm run bootstrap        # 新环境：migrate + build + regression
```

栈：Next.js 16 · React 19 · Supabase · Tailwind 4 · TypeScript

---

## AI 完成模块后的固定流程

1. 实现代码（遵守 PRODUCT_RULES）
2. `npm run build` + `npm run regression-check`（必要时加 `scripts/test-*-v1.ts`）
3. 编辑 **`docs/project-state.json`**：
   - `lastUpdated`、`completedV1` / `pendingV2`、`knownBugs`
   - `roadmap`、`nextRecommended`、`currentFocus`
   - `changelog` **顶部**新增一条
   - 重大决策 → `decisions` **顶部**新增一条
   - `build` / `regression` 状态与日期
   - 里程碑完成时更新 `version` / `nextVersion`
4. 运行 **`npm run sync-docs`**
5. 仅当原则或架构变化时，才改 `PRODUCT_RULES.md` 或 `PROJECT_ARCHITECTURE.md`

**禁止手改**带「自动生成」标记的：`PROJECT_STATUS.md`、`ROADMAP.md`、`CHANGELOG.md`、`AI_CONTEXT.md`、`DECISIONS.md`。

---

## 给用户的一句话

把本文件链接发给新 AI，并说：「按 NEW_CHAT_GUIDE 顺序读 docs，然后开始 [具体任务]。」

---

*阅读顺序与 project-state 同步：2026-06-26*
