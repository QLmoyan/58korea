"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createWhitelistRuleAction,
  deleteWhitelistRuleAction,
  listWhitelistRulesAction,
  setWhitelistRuleEnabledAction,
  updateWhitelistRuleAction,
} from "@/lib/actions/admin-whitelist-rules";
import RuleEditorSheet from "@/components/admin/rules/RuleEditorSheet";
import { RuleRowActions, RuleStatusBadge } from "@/components/admin/rules/RuleRowActions";
import RuleToolbar from "@/components/admin/rules/RuleToolbar";
import type {
  AdminWhitelistRuleItem,
  RuleEnabledFilter,
  RuleSortBy,
  WhitelistRuleFormInput,
} from "@/lib/types/admin-rules";
import { formatRuleHitTime, RULE_MATCH_TYPE_LABELS } from "@/lib/types/admin-rules";

const EMPTY_FORM: WhitelistRuleFormInput = {
  pattern: "",
  category: "白名单",
  matchType: "keyword",
  scoreReduction: 20,
  note: "",
  enabled: true,
};

export default function WhitelistRulesPanel() {
  const [enabledFilter, setEnabledFilter] = useState<RuleEnabledFilter>("all");
  const [sortBy, setSortBy] = useState<RuleSortBy>("priority");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<AdminWhitelistRuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<WhitelistRuleFormInput>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await listWhitelistRulesAction({
        enabled: enabledFilter,
        search: debouncedSearch || undefined,
        sortBy,
      });
      setItems(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, enabledFilter, sortBy]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  function openCreateSheet() {
    setSheetMode("create");
    setEditingId(null);
    setFormValues(EMPTY_FORM);
    setFormError("");
    setSheetOpen(true);
  }

  function openEditSheet(item: AdminWhitelistRuleItem) {
    setSheetMode("edit");
    setEditingId(item.id);
    setFormValues({
      pattern: item.pattern,
      category: item.category,
      matchType: item.matchType,
      scoreReduction: item.scoreReduction,
      note: item.note ?? "",
      enabled: item.enabled,
    });
    setFormError("");
    setSheetOpen(true);
  }

  async function handleSubmit(values: WhitelistRuleFormInput) {
    setSubmitting(true);
    setFormError("");

    try {
      if (sheetMode === "create") {
        await createWhitelistRuleAction(values);
      } else if (editingId) {
        await updateWhitelistRuleAction({ id: editingId, ...values });
      }

      setSheetOpen(false);
      await loadItems();
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleEnabled(item: AdminWhitelistRuleItem) {
    setActingId(item.id);
    setError("");

    try {
      await setWhitelistRuleEnabledAction({ id: item.id, enabled: !item.enabled });
      await loadItems();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "操作失败");
    } finally {
      setActingId(null);
    }
  }

  async function handleDelete(item: AdminWhitelistRuleItem) {
    if (!window.confirm(`确认删除白名单规则「${item.pattern}」？`)) {
      return;
    }

    setActingId(item.id);
    setError("");

    try {
      await deleteWhitelistRuleAction({ id: item.id });
      await loadItems();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败");
    } finally {
      setActingId(null);
    }
  }

  return (
    <section className="space-y-4">
      <RuleToolbar
        enabledFilter={enabledFilter}
        sortBy={sortBy}
        search={search}
        onEnabledFilterChange={setEnabledFilter}
        onSortByChange={setSortBy}
        onSearchChange={setSearch}
        onCreate={openCreateSheet}
      />

      {error ? <p className="text-sm text-rose-500">{error}</p> : null}
      {loading ? <p className="text-sm text-zinc-400">加载中...</p> : null}

      {!loading && items.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-zinc-400 ring-1 ring-zinc-100">
          暂无白名单规则
        </p>
      ) : null}

      <div className="hidden overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-100 lg:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">关键词</th>
              <th className="px-4 py-3 font-medium">分类</th>
              <th className="px-4 py-3 font-medium">匹配</th>
              <th className="px-4 py-3 font-medium">降分</th>
              <th className="px-4 py-3 font-medium">说明</th>
              <th className="px-4 py-3 font-medium">命中次数</th>
              <th className="px-4 py-3 font-medium">最后命中</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-zinc-100">
                <td className="px-4 py-3 font-medium text-zinc-900">{item.pattern}</td>
                <td className="px-4 py-3 text-zinc-600">{item.category}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {RULE_MATCH_TYPE_LABELS[item.matchType]}
                </td>
                <td className="px-4 py-3 text-zinc-600">-{item.scoreReduction}</td>
                <td className="max-w-xs truncate px-4 py-3 text-zinc-600">
                  {item.note || "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600">{item.hitCount}</td>
                <td className="px-4 py-3 text-zinc-600">{formatRuleHitTime(item.lastHitAt)}</td>
                <td className="px-4 py-3">
                  <RuleStatusBadge enabled={item.enabled} />
                </td>
                <td className="px-4 py-3">
                  <RuleRowActions
                    disabled={actingId === item.id}
                    enabled={item.enabled}
                    onEdit={() => openEditSheet(item)}
                    onToggle={() => handleToggleEnabled(item)}
                    onDelete={() => handleDelete(item)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 lg:hidden">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900">{item.pattern}</span>
              <RuleStatusBadge enabled={item.enabled} />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {item.category} · {RULE_MATCH_TYPE_LABELS[item.matchType]} · -{item.scoreReduction} 分 · 命中{" "}
              {item.hitCount} 次
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              最后命中：{formatRuleHitTime(item.lastHitAt)}
            </p>
            {item.note ? <p className="mt-2 text-sm text-zinc-600">{item.note}</p> : null}
            <div className="mt-4">
              <RuleRowActions
                disabled={actingId === item.id}
                enabled={item.enabled}
                onEdit={() => openEditSheet(item)}
                onToggle={() => handleToggleEnabled(item)}
                onDelete={() => handleDelete(item)}
              />
            </div>
          </article>
        ))}
      </div>

      <RuleEditorSheet
        open={sheetOpen}
        ruleKind="whitelist"
        mode={sheetMode}
        initialValues={formValues}
        submitting={submitting}
        error={formError}
        onClose={() => setSheetOpen(false)}
        onSubmit={(values) => handleSubmit(values as WhitelistRuleFormInput)}
      />
    </section>
  );
}
