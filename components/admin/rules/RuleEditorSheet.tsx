"use client";

import { useEffect, useState } from "react";
import type {
  BlockRuleFormInput,
  RiskRuleFormInput,
  RuleMatchType,
  WhitelistRuleFormInput,
} from "@/lib/types/admin-rules";
import { RULE_MATCH_TYPE_OPTIONS } from "@/lib/types/admin-rules";

type RuleKind = "block" | "risk" | "whitelist";

type RuleFormValues =
  | BlockRuleFormInput
  | RiskRuleFormInput
  | WhitelistRuleFormInput;

interface RuleEditorSheetProps {
  open: boolean;
  ruleKind: RuleKind;
  mode: "create" | "edit";
  initialValues: RuleFormValues;
  submitting: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: RuleFormValues) => Promise<void>;
}

const RULE_KIND_LABELS: Record<RuleKind, string> = {
  block: "拦截规则",
  risk: "风险规则",
  whitelist: "白名单规则",
};

export default function RuleEditorSheet({
  open,
  ruleKind,
  mode,
  initialValues,
  submitting,
  error,
  onClose,
  onSubmit,
}: RuleEditorSheetProps) {
  const [values, setValues] = useState(initialValues);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
    }
  }, [open, initialValues]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="关闭"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              {mode === "create" ? "新增" : "编辑"}
              {RULE_KIND_LABELS[ruleKind]}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">V1 推荐使用「关键词」匹配</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600"
          >
            关闭
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="关键词 pattern">
            <input
              value={values.pattern}
              onChange={(event) =>
                setValues((current) => ({ ...current, pattern: event.target.value }))
              }
              className={inputClassName}
              placeholder="例如：测试拦截词"
            />
          </Field>

          <Field label="分类 category">
            <input
              value={values.category}
              onChange={(event) =>
                setValues((current) => ({ ...current, category: event.target.value }))
              }
              className={inputClassName}
              placeholder="例如：违规 / 风险 / 招聘"
            />
          </Field>

          <Field label="匹配方式 match_type">
            <select
              value={values.matchType}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  matchType: event.target.value as RuleMatchType,
                }))
              }
              className={inputClassName}
            >
              {RULE_MATCH_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          {ruleKind === "block" ? (
            <Field label="拦截提示 reason_message">
              <textarea
                value={(values as BlockRuleFormInput).reasonMessage}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    reasonMessage: event.target.value,
                  }))
                }
                rows={3}
                className={`${inputClassName} resize-none`}
                placeholder="前台被拒时展示的提示"
              />
            </Field>
          ) : null}

          {ruleKind === "risk" ? (
            <Field label="风险分值 risk_score">
              <input
                type="number"
                min={1}
                step={1}
                value={(values as RiskRuleFormInput).riskScore}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    riskScore: Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </Field>
          ) : null}

          {ruleKind === "whitelist" ? (
            <Field label="降分值 score_reduction">
              <input
                type="number"
                min={0}
                step={1}
                value={(values as WhitelistRuleFormInput).scoreReduction}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    scoreReduction: Number(event.target.value),
                  }))
                }
                className={inputClassName}
              />
            </Field>
          ) : null}

          {ruleKind !== "block" ? (
            <Field label="说明 note">
              <textarea
                value={(values as RiskRuleFormInput | WhitelistRuleFormInput).note}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                rows={3}
                className={`${inputClassName} resize-none`}
                placeholder="可选，便于运营识别"
              />
            </Field>
          ) : null}

          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={values.enabled}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  enabled: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-zinc-300 text-rose-500 focus:ring-rose-200"
            />
            启用规则
          </label>

          {error ? <p className="text-sm text-rose-500">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-gradient-to-r from-rose-500 to-orange-400 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {submitting ? "保存中..." : mode === "create" ? "创建规则" : "保存修改"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none ring-1 ring-zinc-200 placeholder:text-zinc-400 focus:ring-rose-200";
