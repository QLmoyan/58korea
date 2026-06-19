-- Content Safety V1.2 (宽松版) — 规则更新
-- 在 Supabase SQL Editor 执行，或使用 scripts/apply-content-safety-v1.2-rules.ts

BEGIN;

-- 确保 V1.2 block 词存在且启用
INSERT INTO public.content_block_rules (
  pattern, match_type, scope, category, enabled, priority, reason_code, reason_message
)
SELECT pattern, 'keyword', ARRAY['post','comment'], '违规', true, 10, 'BLOCKED', '内容不符合社区规范，无法发布'
FROM (
  VALUES
    ('六合彩'), ('菠菜'), ('上分'), ('下分'), ('冰毒'), ('洗钱'), ('假证'),
    ('跑分'), ('刷单返利'), ('找小姐'), ('包夜'), ('特殊服务'), ('外围'),
    ('楼凤'), ('上门服务'), ('全套'), ('半套')
) AS t(pattern)
ON CONFLICT DO NOTHING;

UPDATE public.content_block_rules
SET enabled = true,
    match_type = 'keyword',
    scope = ARRAY['post','comment'],
    reason_message = '内容不符合社区规范，无法发布'
WHERE pattern IN (
  '六合彩','菠菜','上分','下分','冰毒','洗钱','假证','跑分','刷单返利',
  '找小姐','包夜','特殊服务','外围','楼凤','上门服务','全套','半套'
);

-- 关闭不在 V1.2 名单内的 risk 规则
UPDATE public.content_risk_rules
SET enabled = false
WHERE pattern NOT IN (
  '日薪百万','妹子优先','飞机联系','资源','资源局',
  '兄弟局','喝茶','内部渠道','女生优先'
);

-- V1.2 risk 权重
INSERT INTO public.content_risk_rules (
  pattern, match_type, scope, category, enabled, priority, risk_score, note
)
SELECT pattern, 'keyword', ARRAY['post','comment'], '风险', true, 10, risk_score, 'Content Safety V1.2'
FROM (
  VALUES
    ('日薪百万', 15),
    ('妹子优先', 5),
    ('飞机联系', 5),
    ('资源', 5),
    ('资源局', 10),
    ('兄弟局', 10),
    ('喝茶', 5),
    ('内部渠道', 10),
    ('女生优先', 5)
) AS t(pattern, risk_score)
ON CONFLICT DO NOTHING;

UPDATE public.content_risk_rules AS r
SET enabled = true,
    match_type = 'keyword',
    scope = ARRAY['post','comment'],
    risk_score = v.risk_score,
    note = 'Content Safety V1.2'
FROM (
  VALUES
    ('日薪百万', 15),
    ('妹子优先', 5),
    ('飞机联系', 5),
    ('资源', 5),
    ('资源局', 10),
    ('兄弟局', 10),
    ('喝茶', 5),
    ('内部渠道', 10),
    ('女生优先', 5)
) AS v(pattern, risk_score)
WHERE r.pattern = v.pattern;

COMMIT;
