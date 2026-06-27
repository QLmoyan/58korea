# 58korea 文档索引

## 新 AI / 新成员：从这里开始

**必读顺序**见 **[NEW_CHAT_GUIDE.md](./NEW_CHAT_GUIDE.md)**。

| 顺序 | 文档 | 维护方式 |
|:---:|---|---|
| 1 | [AI_CONTEXT.md](./AI_CONTEXT.md) | 自动生成 |
| 2 | [PRODUCT_RULES.md](./PRODUCT_RULES.md) | 人工（原则变更时） |
| 3 | [PROJECT_STATUS.md](./PROJECT_STATUS.md) | 自动生成 |
| 4 | [ROADMAP.md](./ROADMAP.md) | 自动生成 |
| 5 | [CHANGELOG.md](./CHANGELOG.md) | 自动生成 |
| 6 | [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md) | 人工（架构变更时） |
| 7 | [DECISIONS.md](./DECISIONS.md) | 自动生成（决策写入 JSON） |

## 单一事实来源

**[`project-state.json`](./project-state.json)** — 版本、Focus、模块、Bug、路线、Changelog、Decisions。

更新后运行：

```bash
npm run sync-docs
```

## 运维

- **[deployment-checklist.md](./deployment-checklist.md)** — 部署与 bootstrap

## 不要手改的文件

以下文件带「自动生成」标记，由 `scripts/sync-project-docs.ts` 生成：

- `AI_CONTEXT.md`
- `PROJECT_STATUS.md`
- `ROADMAP.md`
- `CHANGELOG.md`
- `DECISIONS.md`
