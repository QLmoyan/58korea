"use client";

import { useState } from "react";
import { testModerationRulesAction } from "@/lib/actions/admin-rule-tester";
import type { AdminRuleTestResult } from "@/lib/types/admin-rule-tester";
import {
  MODERATION_STATUS_LABELS,
  RISK_LEVEL_LABELS,
  type RuleTesterTargetType,
} from "@/lib/types/admin-rule-tester";

export default function RuleTesterPanel() {
  const [targetType, setTargetType] = useState<RuleTesterTargetType>("post");
  const [title, setTitle] = useState("规则测试标题");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("其他");
  const [replyToAuthor, setReplyToAuthor] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AdminRuleTestResult | null>(null);

  async function handleTest() {
    setLoading(true);
    setError("");

    try {
      const data = await testModerationRulesAction({
        targetType,
        title,
        content,
        category,
        replyToAuthor: replyToAuthor || undefined,
      });
      setResult(data);
    } catch (testError) {
      setResult(null);
      setError(testError instanceof Error ? testError.message : "检测失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100 lg:p-6">
        <div className="flex flex-wrap gap-2">
          <TargetTypeButton
            active={targetType === "post"}
            onClick={() => setTargetType("post")}
          >
            帖子
          </TargetTypeButton>
          <TargetTypeButton
            active={targetType === "comment"}
            onClick={() => setTargetType("comment")}
          >
            评论/回复
          </TargetTypeButton>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {targetType === "post" ? (
            <>
              <Field label="标题">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={inputClassName}
                />
              </Field>
              <Field label="分类">
                <input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className={inputClassName}
                />
              </Field>
            </>
          ) : (
            <Field label="回复对象（可选）">
              <input
                value={replyToAuthor}
                onChange={(event) => setReplyToAuthor(event.target.value)}
                className={inputClassName}
                placeholder="@用户名"
              />
            </Field>
          )}

          <div className={targetType === "post" ? "lg:col-span-2" : ""}>
            <Field label="检测文本">
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={6}
                className={`${inputClassName} resize-none`}
                placeholder="输入任意文本，模拟发帖/评论时的内容安全检测"
              />
            </Field>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-500">{error}</p> : null}

        <button
          type="button"
          onClick={handleTest}
          disabled={loading || !content.trim()}
          className="mt-4 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
        >
          {loading ? "检测中..." : "开始检测"}
        </button>
      </div>

      {result ? <RuleTestResultCard result={result} /> : null}
    </section>
  );
}

function RuleTestResultCard({ result }: { result: AdminRuleTestResult }) {
  return (
    <div className="space-y-4">
      <div
        className={`rounded-2xl p-4 ring-1 ${
          result.rejected
            ? "bg-rose-50 ring-rose-100"
            : "bg-white ring-zinc-100"
        }`}
      >
        {result.rejected ? (
          <div>
            <p className="text-base font-semibold text-rose-600">拒绝发布</p>
            <p className="mt-2 text-sm text-rose-700">
              {result.rejectMessage ?? "内容不符合社区规范，无法发布"}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <ResultBadge label={`score ${result.riskScore}`} />
            <ResultBadge label={RISK_LEVEL_LABELS[result.riskLevel]} />
            <ResultBadge label={MODERATION_STATUS_LABELS[result.moderationStatus]} />
          </div>
        )}

        {!result.rejected && result.userMessage ? (
          <p className="mt-3 text-sm text-zinc-600">作者提示：{result.userMessage}</p>
        ) : null}
      </div>

      {result.matchedBlockRules.length > 0 ? (
        <RuleHitSection title="命中拦截规则">
          {result.matchedBlockRules.map((rule) => (
            <li key={rule.id} className="text-sm text-zinc-700">
              {rule.pattern} · {rule.reason_message ?? rule.category}
            </li>
          ))}
        </RuleHitSection>
      ) : null}

      {result.scoreBreakdown.length > 0 ? (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-900">分数明细</h3>
          <ul className="mt-3 space-y-2">
            {result.scoreBreakdown.map((item) => (
              <li
                key={`${item.kind}-${item.label}`}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-zinc-700">{item.label}</span>
                <span
                  className={
                    item.delta >= 0 ? "font-medium text-amber-700" : "font-medium text-emerald-700"
                  }
                >
                  {item.delta >= 0 ? `+${item.delta}` : item.delta}
                </span>
              </li>
            ))}
          </ul>
          {!result.rejected ? (
            <div className="mt-4 border-t border-zinc-100 pt-3 text-sm text-zinc-600">
              原始 risk 分 {result.rawRiskScore}，白名单降分 {result.whitelistReduction}，最终 score{" "}
              {result.riskScore}
            </div>
          ) : null}
        </div>
      ) : null}

      {result.matchedRiskRules.length > 0 ? (
        <RuleHitSection title="命中风险规则">
          {result.matchedRiskRules.map((rule) => (
            <li key={rule.id} className="text-sm text-zinc-700">
              {rule.pattern} +{rule.risk_score}
            </li>
          ))}
        </RuleHitSection>
      ) : null}

      {result.matchedWhitelistRules.length > 0 ? (
        <RuleHitSection title="命中白名单规则">
          {result.matchedWhitelistRules.map((rule) => (
            <li key={rule.id} className="text-sm text-zinc-700">
              {rule.pattern} -{rule.score_reduction}
            </li>
          ))}
        </RuleHitSection>
      ) : null}

      <div className="rounded-2xl bg-zinc-50 p-4 text-xs text-zinc-500 ring-1 ring-zinc-100">
        可见性：{result.visible ? "前台可见" : "前台不可见"} · 审核队列：
        {result.shouldCreateReview ? "会进入" : "不会进入"} · 本检测不会发帖，也不会增加 hit_count
      </div>
    </div>
  );
}

function RuleHitSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-zinc-100">
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
      <ul className="mt-3 space-y-2">{children}</ul>
    </div>
  );
}

function TargetTypeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium ${
        active ? "bg-rose-500 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function ResultBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
      {label}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-200";
