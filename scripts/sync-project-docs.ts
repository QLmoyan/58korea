/**
 * Regenerate project docs from docs/project-state.json.
 * Run after completing any module: npm run sync-docs
 *
 * Generated: PROJECT_STATUS, ROADMAP, CHANGELOG, AI_CONTEXT, DECISIONS
 * Manual: PRODUCT_RULES, PROJECT_ARCHITECTURE, NEW_CHAT_GUIDE
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface Decision {
  date: string;
  id: string;
  decision: string;
  reason: string;
  rejected: string;
}

interface ProjectState {
  version: string;
  nextVersion?: string;
  developmentStage?: string;
  productName: string;
  productTagline: string;
  lastUpdated: string;
  currentFocus?: string[];
  build: { status: string; lastVerified: string; command: string };
  regression: {
    status: string;
    passed: number;
    total: number;
    lastVerified: string;
    command: string;
  };
  completedV1: Array<{ id: string; name: string; summary: string }>;
  pendingV2: Array<{ id: string; name: string; summary: string }>;
  notStarted: Array<{ id: string; name: string; summary: string }>;
  knownBugs: Array<{ id: string; severity: string; summary: string }>;
  roadmap: {
    p1: Array<{ id: string; name: string; status: string }>;
    p2: Array<{ id: string; name: string; status: string }>;
    p3: Array<{ id: string; name: string; status: string }>;
    completed: string[];
    deferred: Array<{ id: string; name: string; reason: string }>;
    wontDo: Array<{ id: string; name: string; reason: string }>;
  };
  changelog: Array<{
    version: string;
    date: string;
    title: string;
    items: string[];
  }>;
  nextRecommended: string[];
  decisions?: Decision[];
  docCommands: { sync: string; verifyBuild: string; verifyRegression: string };
}

const DOCS_DIR = resolve(process.cwd(), "docs");
const STATE_PATH = resolve(DOCS_DIR, "project-state.json");

function loadState(): ProjectState {
  const raw = readFileSync(STATE_PATH, "utf8");
  return JSON.parse(raw) as ProjectState;
}

function writeDoc(filename: string, content: string) {
  const path = resolve(DOCS_DIR, filename);
  writeFileSync(path, content, "utf8");
  console.log(`  ✓ ${filename}`);
}

function renderProjectStatus(state: ProjectState): string {
  const bugLines =
    state.knownBugs.length === 0
      ? "- 当前无记录中的已知 Bug"
      : state.knownBugs
          .map(
            (bug) =>
              `- **[${bug.severity}]** \`${bug.id}\` — ${bug.summary}`,
          )
          .join("\n");

  const focusItems = state.currentFocus ?? state.nextRecommended;
  const focusLines = focusItems.map((item) => `- ${item}`).join("\n");
  const nextVersion = state.nextVersion ?? "（见 roadmap）";
  const stage = state.developmentStage ?? "—";

  return `# PROJECT_STATUS

> 自动生成文件。请勿手改。更新 \`docs/project-state.json\` 后运行 \`${state.docCommands.sync}\`。

最后更新：**${state.lastUpdated}**

## 快照

| 项 | 值 |
|---|---|
| **Current Version** | \`${state.version}\` |
| **Next Version** | \`${nextVersion}\` |
| **Development Stage** | ${stage} |
| **Build** | **${state.build.status}**（${state.build.lastVerified}） |
| **Regression** | **${state.regression.status}** ${state.regression.passed}/${state.regression.total}（${state.regression.lastVerified}） |

## Current Focus

${focusLines}

验证命令：\`${state.build.command}\` · \`${state.regression.command}\`

## 产品与技术

- **产品**：${state.productName}（${state.productTagline}）
- **技术栈**：Next.js 16 · React 19 · Supabase · Tailwind 4

## 已完成模块（V1）

${state.completedV1.map((m) => `- **${m.name}** (\`${m.id}\`) — ${m.summary}`).join("\n")}

## 待优化模块（V2）

${state.pendingV2.map((m) => `- **${m.name}** (\`${m.id}\`) — ${m.summary}`).join("\n")}

## 未开始模块

${state.notStarted.map((m) => `- **${m.name}** (\`${m.id}\`) — ${m.summary}`).join("\n")}

## 当前 Bug / 体验债

${bugLines}

## 建议下一步

${state.nextRecommended.map((item) => `- ${item}`).join("\n")}

## 相关文档

- [AI_CONTEXT.md](./AI_CONTEXT.md) — AI 首次接手（短）
- [PRODUCT_RULES.md](./PRODUCT_RULES.md) — 产品长期原则
- [PROJECT_ARCHITECTURE.md](./PROJECT_ARCHITECTURE.md) — 架构与 Store
- [DECISIONS.md](./DECISIONS.md) — 重大产品决策
- [ROADMAP.md](./ROADMAP.md) — 优先级路线
- [CHANGELOG.md](./CHANGELOG.md) — 版本变更记录
- [NEW_CHAT_GUIDE.md](./NEW_CHAT_GUIDE.md) — 新对话阅读顺序
- [deployment-checklist.md](./deployment-checklist.md) — 部署清单
`;
}

function renderRoadmap(state: ProjectState): string {
  const completedNames = state.completedV1
    .filter((m) => state.roadmap.completed.includes(m.id))
    .map((m) => `- ✅ **${m.name}** (\`${m.id}\`)`)
    .join("\n");

  const nextVersion = state.nextVersion ?? state.version;

  return `# ROADMAP

> 自动生成文件。请勿手改。更新 \`docs/project-state.json\` 后运行 \`${state.docCommands.sync}\`。

最后更新：**${state.lastUpdated}** · 当前版本 \`${state.version}\` · 下一目标 \`${nextVersion}\`

## 已完成（近期收口）

${completedNames || "- （见 project-state.json roadmap.completed）"}

## P1 — 优先（信任与账号基础）

${state.roadmap.p1.map((item) => `- ⏳ **${item.name}** (\`${item.id}\`)`).join("\n")}

## P2 — 运营与体验补全

${state.roadmap.p2.map((item) => `- ⏳ **${item.name}** (\`${item.id}\`)`).join("\n")}

## P3 — polish / 工程

${state.roadmap.p3.map((item) => `- ⏳ **${item.name}** (\`${item.id}\`)`).join("\n")}

## 暂缓（Deferred）

${state.roadmap.deferred.map((item) => `- **${item.name}** (\`${item.id}\`) — ${item.reason}`).join("\n")}

## 不要开发（Won't Do）

${state.roadmap.wontDo.map((item) => `- ❌ **${item.name}** (\`${item.id}\`) — ${item.reason}`).join("\n")}

## 维护说明

每完成一个模块：

1. 编辑 \`docs/project-state.json\`（completed / changelog / bugs / roadmap / version）
2. 重大产品决策追加到 \`decisions\` 数组顶部
3. 运行 \`${state.docCommands.sync}\`
4. 按需运行 \`${state.docCommands.verifyBuild}\` 与 \`${state.docCommands.verifyRegression}\`，将结果写回 JSON
`;
}

function renderChangelog(state: ProjectState): string {
  const sections = state.changelog
    .map((entry) => {
      const items = entry.items.map((item) => `- ${item}`).join("\n");
      return `## [${entry.version}] ${entry.title} — ${entry.date}

${items}
`;
    })
    .join("\n");

  const stage = state.developmentStage ?? "—";

  return `# CHANGELOG

> 自动生成文件。请勿手改。更新 \`docs/project-state.json\` 后运行 \`${state.docCommands.sync}\`。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。当前主版本：**${state.version}**（${stage}）。

${sections}
## 维护说明

新增模块时在 \`docs/project-state.json\` → \`changelog\` 数组**顶部**插入一条记录。若该模块代表一个可发布里程碑，同步更新 \`version\` 并将 \`nextVersion\` 设为下一目标，然后运行 \`${state.docCommands.sync}\`。
`;
}

function renderDecisions(state: ProjectState): string {
  const decisions = state.decisions ?? [];
  const rows = decisions
    .map(
      (d) => `### ${d.date} · \`${d.id}\`

| | |
|---|---|
| **决定** | ${d.decision} |
| **原因** | ${d.reason} |
| **放弃方案** | ${d.rejected} |

`,
    )
    .join("\n");

  return `# DECISIONS

> 自动生成文件。请勿手改。重大决策写入 \`docs/project-state.json\` → \`decisions\` 数组**顶部**，然后运行 \`${state.docCommands.sync}\`。

58korea 重大产品与技术决策记录。新决策只追加到 JSON，不删改历史条目。

最后更新：**${state.lastUpdated}**

---

${rows || "_暂无记录。_"}

---

## 如何追加

\`\`\`json
{
  "date": "YYYY-MM-DD",
  "id": "short-kebab-id",
  "decision": "做了什么决定",
  "reason": "为什么",
  "rejected": "考虑过但没选的方案"
}
\`\`\`

插入 \`project-state.json\` 的 \`decisions\` 数组**第一项**，运行 \`${state.docCommands.sync}\`。
`;
}

function renderAiContext(state: ProjectState): string {
  const focusItems = state.currentFocus ?? state.nextRecommended;
  const focusLines = focusItems.map((item) => `- ${item}`).join("\n");
  const completedShort = state.completedV1
    .slice(0, 10)
    .map((m) => m.name)
    .join("、");
  const completedMore =
    state.completedV1.length > 10
      ? ` 等共 ${state.completedV1.length} 项（完整见 PROJECT_STATUS）`
      : "";
  const wontDoLines = state.roadmap.wontDo
    .map((item) => `- ${item.name} — ${item.reason}`)
    .join("\n");
  const deferredLines = state.roadmap.deferred
    .map((item) => `- ${item.name} — ${item.reason}`)
    .join("\n");
  const extraDontSuggest = [
    "- 复杂商家后台与统计报表",
    "- 用户私信 / IM",
    "- 完整关注社交图谱与关注 Feed",
  ].join("\n");
  const stage = state.developmentStage ?? "—";
  const nextVersion = state.nextVersion ?? "—";

  return `# AI_CONTEXT

> **任何 AI 第一次接手 58korea 必须先读本文档。** 自动生成，勿手改。来源：\`docs/project-state.json\` · 最后更新 **${state.lastUpdated}**

---

## 1. 一句话

**58korea** 是面向在韩华人的 **轻量生活社区**（探店、房屋、招聘、二手、求助、攻略），Next.js + Supabase，当前 ${stage}。

## 2. 产品定位

- **是**：UGC 社区、商家帖内发券、站内通知、频道运营文章、移动端优先
- **不是**：商家 SaaS、独立券平台、IM 私信、分享裂变、经营数据大盘

详见 [PRODUCT_RULES.md](./PRODUCT_RULES.md)。

## 3. 当前开发阶段

**${stage}** — V1 主链路已收口；当前以 **V2 体验债与诚实 UI** 为主，不扩 scope。

## 4. 当前版本

- **Current Version**：\`${state.version}\`
- **Next Version（目标）**：\`${nextVersion}\`
- **Build**：${state.build.status}（${state.build.lastVerified}）
- **Regression**：${state.regression.status} ${state.regression.passed}/${state.regression.total}（${state.regression.lastVerified}）

## 5. Current Focus

${focusLines}

## 6. 产品铁律（不可违背）

1. **券必须绑定发帖** — 无独立优惠券后台
2. **商家与用户同一套 Profile / 登录** — 无复杂商家运营台
3. **不改 RLS 乱开权限** — 前台不用 \`service_role\`
4. **诚实 UI** — 无假按钮、假数据（浏览量/关注等正在清理）
5. **未登录操作带 redirect** — 收藏等可登录后续流程
6. **收口后** \`npm run build\` + \`npm run regression-check\` 必须通过
7. **完成模块** 必须更新 \`project-state.json\` 并 \`npm run sync-docs\`

## 7. 已完成模块（摘要）

${completedShort}${completedMore}

完整列表与 Bug 见 [PROJECT_STATUS.md](./PROJECT_STATUS.md)。

## 8. 不要建议开发

以下与产品方向冲突，**不要主动提议**（除非用户明确要求）：

${wontDoLines}

暂缓（非永久禁止，但非当前重点）：

${deferredLines}

${extraDontSuggest}

## 9. 接下来读什么

按 [NEW_CHAT_GUIDE.md](./NEW_CHAT_GUIDE.md) 顺序继续：

PRODUCT_RULES → PROJECT_STATUS → ROADMAP → CHANGELOG → PROJECT_ARCHITECTURE → DECISIONS

## 10. 关键命令

\`\`\`bash
npm run dev
npm run build
npm run regression-check
npm run sync-docs      # 更新 JSON 后同步文档
npm run bootstrap      # 新环境：migrate + build + regression
\`\`\`

单一事实来源：**\`docs/project-state.json\`**
`;
}

function main() {
  console.log("Syncing project docs from docs/project-state.json ...");
  const state = loadState();
  writeDoc("PROJECT_STATUS.md", renderProjectStatus(state));
  writeDoc("ROADMAP.md", renderRoadmap(state));
  writeDoc("CHANGELOG.md", renderChangelog(state));
  writeDoc("AI_CONTEXT.md", renderAiContext(state));
  writeDoc("DECISIONS.md", renderDecisions(state));
  console.log("\nDone. Manual docs: PRODUCT_RULES, PROJECT_ARCHITECTURE, NEW_CHAT_GUIDE.");
}

main();
