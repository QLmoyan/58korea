"use client";

import { useState } from "react";
import BlockRulesPanel from "@/components/admin/rules/BlockRulesPanel";
import RiskRulesPanel from "@/components/admin/rules/RiskRulesPanel";
import WhitelistRulesPanel from "@/components/admin/rules/WhitelistRulesPanel";

type RulesSubTab = "block" | "risk" | "whitelist";

const SUB_TABS: Array<{ value: RulesSubTab; label: string }> = [
  { value: "block", label: "拦截规则" },
  { value: "risk", label: "风险规则" },
  { value: "whitelist", label: "白名单规则" },
];

export default function RulesManagementPanel() {
  const [subTab, setSubTab] = useState<RulesSubTab>("block");

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SUB_TABS.map((tab) => {
          const active = subTab === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setSubTab(tab.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                active
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {subTab === "block" ? <BlockRulesPanel /> : null}
      {subTab === "risk" ? <RiskRulesPanel /> : null}
      {subTab === "whitelist" ? <WhitelistRulesPanel /> : null}
    </section>
  );
}
