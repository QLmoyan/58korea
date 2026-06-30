# Region Seed V1 — 韩国华人常用商圈种子草案

> **版本**：v0.3 Phase 0  
> **状态**：待审查 — 不含 migration、不含业务代码  
> **关联**：[region-hub-v1.md](./region-hub-v1.md)（宏观参考）、[place-hub-v1.md](./place-hub-v1.md)（**主模型**）  
> **最后更新**：2026-06-17

---

## 1. 文档说明

### 1.1 用途

本文件供产品/运营/开发在 **Phase 1 migration 之前** 审查商圈列表，确认：

- 名称是否符合在韩华人日常用语
- slug 是否稳定、无冲突
- `why_relevant` 是否覆盖租房/招聘/探店/求助等核心场景
- P0 规模是否可控（首批 **26** 个 Area）

### 1.2 字段说明

| 字段 | 说明 |
|------|------|
| `name_cn` | 中文常用名（入库映射为 `areas.name_zh`） |
| `name_ko` | 韩文常用名 |
| `name_en` | 英文常用名 / 罗马字 |
| `slug` | Region 内唯一；URL 形如 `/regions/seoul/konkuk` |
| `region` | 所属 Region slug（`seoul` / `gyeonggi` / …） |
| `district` | 韩文行政区参考（**审查用**；Phase 1 不入库，见 hub 文档 §14） |
| `why_relevant` | 对在韩华人的意义 |
| `seed_priority` | `P0` 首批 / `P1` 第二批 / `P2` 延后 |
| `coords_status` | 坐标状态：`estimated`（本草案）→ `verified`（校准后） |
| `center_lat` / `center_lng` | 估计中心点（米级精度即可，后续校准） |
| `radius_m` | 建议匹配半径（米） |
| `search_aliases` | 建议入库别名（映射 `areas.search_aliases`） |
| `is_hot` | 是否热门快捷入口 |

### 1.3 批次统计

| 优先级 | 数量 | Phase 1 入库 |
|--------|------|--------------|
| **P0** | **26** | ✅ 首批 |
| P1 | 14 | 视审查结果 |
| P2 | 12 | 延后 |
| **合计** | 52 | — |

---

## 2. 坐标策略

- 本草案所有坐标均为 **`coords_status: estimated`**，来源于公开地图中心点估算，**不要求 100% 精准**。
- Phase 1 seed 入库后，由开发在地图上抽检 **至少 5 个 P0 商圈**，将 `coords_status` 更新为 `verified` 并微调 `radius_m`。
- **用户 GPS 坐标永不入库**；表中坐标仅为商圈字典中心点，供客户端映射使用。

---

## 3. P0 — 首批 26 个 Area（Phase 1 必审）

### 3.1 首尔（17）

| slug | name_cn | name_ko | name_en | district | is_hot |
|------|---------|---------|---------|----------|--------|
| `konkuk` | 建大 | 건대 | Konkuk | 광진구 | true |
| `hongdae` | 弘大 | 홍대 | Hongdae | 마포구 | true |
| `sinchon` | 新村 | 신촌 | Sinchon | 서대문구 | true |
| `gangnam` | 江南 | 강남 | Gangnam | 강남구 | true |
| `myeongdong` | 明洞 | 명동 | Myeongdong | 중구 | true |
| `dongdaemun` | 东大门 | 동대문 | Dongdaemun | 동대문구 | true |
| `itaewon` | 梨泰院 | 이태원 | Itaewon | 용산구 | true |
| `jamsil` | 蚕室 | 잠실 | Jamsil | 송파구 | true |
| `yeongdeungpo` | 永登浦 | 영등포 | Yeongdeungpo | 영등포구 | false |
| `guro` | 九老 | 구로 | Guro | 구로구 | false |
| `daerim` | 大林 | 대림 | Daerim | 구로구 | false |
| `kyunghee-hoegi` | 庆熙大/回基 | 회기/경희대 | Kyung Hee / Hoegi | 동대문구 | true |
| `snu-entrance` | 首尔大入口 | 서울대입구 | Seoul National Univ. | 관악구 | true |
| `korea-u-anyang` | 高丽大/安岩 | 고려대/안암 | Korea Univ. / Anam | 성북구 | true |
| `yonsei` | 延世 | 연세/신촌연세 | Yonsei | 서대문구 | true |
| `sungkyunkwan-hyu` | 成均馆/惠化 | 성균관대/혜화 | Sungkyunkwan / Hyehwa | 종로구 | false |
| `seongsu` | 圣水 | 성수 | Seongsu | 성동구 | false |

<details>
<summary>P0 首尔 — 逐条 why_relevant 与坐标（点击展开）</summary>

#### `konkuk` 建大

| 属性 | 值 |
|------|-----|
| region | `seoul` |
| why_relevant | 华人留学生与打工密度高；租房、二手、探店、家教帖极多；韩圈历史帖常出现「建国大学」「建大」 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.5404 / 127.0707 |
| radius_m | 1200 |
| search_aliases | `建国大学`, `建国`, `건대`, `건대입구`, `Konkuk Univ` |

#### `hongdae` 弘大

| 属性 | 值 |
|------|-----|
| region | `seoul` |
| why_relevant | 年轻人消费与兼职中心；探店、活动、租房合租信息集中 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.5563 / 126.9237 |
| radius_m | 1300 |
| search_aliases | `弘益大学`, `홍대입구`, `Hongik` |

#### `sinchon` 新村

| 属性 | 值 |
|------|-----|
| region | `seoul` |
| why_relevant | 延世/梨花/西江等高校圈；华人租房与招聘（家教、打工）高频区 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.5559 / 126.9368 |
| radius_m | 1100 |
| search_aliases | `新村站`, `신촌역` |

#### `gangnam` 江南

| 属性 | 值 |
|------|-----|
| region | `seoul` |
| why_relevant | 就业、商务、高端餐饮与医美；华人商家与招聘帖多 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.4979 / 127.0276 |
| radius_m | 2000 |
| search_aliases | `江南站`, `강남역`, `Gangnam Station` |

#### `myeongdong` 明洞

| 属性 | 值 |
|------|-----|
| region | `seoul` |
| why_relevant | 游客与华人商家聚集；购物、餐饮、兼职导游/翻译类信息 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.5636 / 126.9850 |
| radius_m | 1000 |
| search_aliases | `明洞站`, `명동`, `Myeong-dong` |

#### `dongdaemun` 东大门

| 属性 | 值 |
|------|-----|
| region | `seoul` |
| why_relevant | 批发零售、物流兼职、华人商户；住房帖常写「东大门附近」 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.5665 / 127.0090 |
| radius_m | 1200 |
| search_aliases | `东大门市场`, `동대문`, `DDP` |

#### `itaewon` 梨泰院

| 属性 | 值 |
|------|-----|
| region | `seoul` |
| why_relevant | 外籍与华人社交活跃；餐饮、酒吧、招聘（外语岗位） |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.5344 / 126.9943 |
| radius_m | 900 |
| search_aliases | `梨泰院站`, `이태원` |

#### `jamsil` 蚕室

| 属性 | 值 |
|------|-----|
| region | `seoul` |
| why_relevant | 乐天世界/石村湖周边；家庭型华人社区、租房与亲子类帖子 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.5133 / 127.1002 |
| radius_m | 1400 |
| search_aliases | `蚕室站`, `잠실`, `乐天世界` |

#### `yeongdeungpo` 永登浦

| 属性 | 值 |
|------|-----|
| region | `seoul` |
| why_relevant | 交通换乘枢纽；打工、房屋、二手交易实用向内容多 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.5175 / 126.9078 |
| radius_m | 1200 |
| search_aliases | `永登浦站`, `영등포`, `Times Square` |

#### `guro` 九老

| 属性 | 值 |
|------|-----|
| region | `seoul` |
| why_relevant | 华人制造业/物流打工者聚集；招聘与合租帖常见 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.5030 / 126.8819 |
| radius_m | 1300 |
| search_aliases | `九老站`, `구로`, `数字园区` |

#### `daerim` 大林

| 属性 | 值 |
|------|-----|
| region | `seoul` |
| why_relevant | 传统华人劳工与餐饮集中区；租房便宜、招聘需求大 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.4930 / 126.8955 |
| radius_m | 1000 |
| search_aliases | `大林站`, `대림`, `中华街` |

#### `kyunghee-hoegi` 庆熙大/回基

| 属性 | 值 |
|------|-----|
| region | `seoul` |
| why_relevant | 庆熙大留学生圈；外语家教、租房、回基站周边生活帖 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.5940 / 127.0530 |
| radius_m | 1100 |
| search_aliases | `回基`, `회기`, `庆熙`, `경희대`, `외대앞` |

#### `snu-entrance` 首尔大入口

| 属性 | 值 |
|------|-----|
| region | `seoul` |
| why_relevant | 首尔大学圈入口；学术、租房、家教类帖子标识性强 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.4813 / 126.9527 |
| radius_m | 1200 |
| search_aliases | `首尔大学`, `서울대`, `관악`, `SNU` |

#### `korea-u-anyang` 高丽大/安岩

| 属性 | 值 |
|------|-----|
| region | `seoul` |
| why_relevant | 高丽大本馆与安岩站周边；华人留学生租房与餐饮探店 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.5890 / 127.0328 |
| radius_m | 1100 |
| search_aliases | `高丽大学`, `고려대`, `安岩`, `안암` |

#### `yonsei` 延世

| 属性 | 值 |
|------|-----|
| region | `seoul` |
| why_relevant | 韩圈历史帖含「延世大学」；与新村重叠但用户常单独提及 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.5665 / 126.9388 |
| radius_m | 1000 |
| search_aliases | `延世大学`, `연세대`, `Yonsei Univ` |

#### `sungkyunkwan-hyu` 成均馆/惠化

| 属性 | 值 |
|------|-----|
| region | `seoul` |
| why_relevant | 成均馆大学生与惠化文艺圈；兼职、租房、小组活动 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.5875 / 127.0018 |
| radius_m | 1000 |
| search_aliases | `成均馆`, `성균관대`, `惠化`, `혜화` |

#### `seongsu` 圣水

| 属性 | 值 |
|------|-----|
| region | `seoul` |
| why_relevant | 网红探店与文创产业聚集；年轻华人消费与就业信息增多 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.5445 / 127.0557 |
| radius_m | 1100 |
| search_aliases | `圣水洞`, `성수동`, `Seongsu-dong` |

</details>

### 3.2 京畿（2）

| slug | name_cn | name_ko | name_en | district | is_hot |
|------|---------|---------|---------|----------|--------|
| `ansan` | 安山 | 안산 | Ansan | 안산시 | true |
| `suwon` | 水原 | 수원 | Suwon | 수원시 | true |

<details>
<summary>P0 京畿 — 逐条详情</summary>

#### `ansan` 安山

| 属性 | 值 |
|------|-----|
| region | `gyeonggi` |
| why_relevant | 安山华人密度高（工厂、餐饮）；招聘与合租是核心场景 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.3219 / 126.8309 |
| radius_m | 2500 |
| search_aliases | `安山站`, `안산역`, `안산차이나타운`, `新安` |

#### `suwon` 水原

| 属性 | 值 |
|------|-----|
| region | `gyeonggi` |
| why_relevant | 京畿南部枢纽城市；三星圈、华人商家与租房 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.2636 / 127.0286 |
| radius_m | 2500 |
| search_aliases | `水原站`, `수원역`, `灵通`, `영통` |

</details>

### 3.3 仁川（3）

| slug | name_cn | name_ko | name_en | district | is_hot |
|------|---------|---------|---------|----------|--------|
| `bupyeong` | 富平 | 부평 | Bupyeong | 부평구 | true |
| `songdo` | 松岛 | 송도 | Songdo | 연수구 | true |
| `incheon-airport` | 仁川机场 | 인천공항 | Incheon Airport | 중구 | true |

<details>
<summary>P0 仁川 — 逐条详情</summary>

#### `bupyeong` 富平

| 属性 | 值 |
|------|-----|
| region | `incheon` |
| why_relevant | 仁川华人商业与餐饮集中；打工、租房实用信息 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.4895 / 126.7248 |
| radius_m | 1500 |
| search_aliases | `富平站`, `부평역`, `부평차이나타운` |

#### `songdo` 松岛

| 属性 | 值 |
|------|-----|
| region | `incheon` |
| why_relevant | 国际新城、留学生与白领；房屋、招聘质量相对较高 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.3827 / 126.6568 |
| radius_m | 2000 |
| search_aliases | `松岛国际城`, `송도`, `Songdo IBD` |

#### `incheon-airport` 仁川机场

| 属性 | 值 |
|------|-----|
| region | `incheon` |
| why_relevant | 韩圈历史帖「仁川机场」「入境接机」；求助与拼车高频 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 37.4602 / 126.4407 |
| radius_m | 5000 |
| search_aliases | `ICN`, `인천국제공항`, `T1`, `T2`, `机场` |

</details>

### 3.4 釜山（4）

| slug | name_cn | name_ko | name_en | district | is_hot |
|------|---------|---------|---------|----------|--------|
| `seomyeon` | 西面 | 서면 | Seomyeon | 부산진구 | true |
| `haeundae` | 海云台 | 해운대 | Haeundae | 해운대구 | true |
| `busan-univ` | 釜山大/釜大 | 부산대/부경대 | Busan Univ. | 금정구 | false |
| `gwangalli` | 广安里 | 광안리 | Gwangalli | 수영구 | false |

<details>
<summary>P0 釜山 — 逐条详情</summary>

#### `seomyeon` 西面

| 属性 | 值 |
|------|-----|
| region | `busan` |
| why_relevant | 釜山市中心商圈；华人商家、餐饮、招聘聚合点 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 35.1579 / 129.0595 |
| radius_m | 1500 |
| search_aliases | `西面站`, `서면역` |

#### `haeundae` 海云台

| 属性 | 值 |
|------|-----|
| region | `busan` |
| why_relevant | 旅游与居留华人双高；探店、房屋短租、兼职 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 35.1587 / 129.1604 |
| radius_m | 1800 |
| search_aliases | `海云台站`, `해운대해수욕장`, `Haeundae Beach` |

#### `busan-univ` 釜山大/釜大

| 属性 | 值 |
|------|-----|
| region | `busan` |
| why_relevant | 釜山地区留学生圈；家教、租房帖 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 35.2338 / 129.0847 |
| radius_m | 1500 |
| search_aliases | `釜山大学`, `부산대`, `부경대`, `온천장` |

#### `gwangalli` 广安里

| 属性 | 值 |
|------|-----|
| region | `busan` |
| why_relevant | 海滩夜生活与餐饮；华人聚会、探店内容 |
| seed_priority | P0 |
| coords_status | estimated |
| center_lat / center_lng | 35.1532 / 129.1186 |
| radius_m | 1200 |
| search_aliases | `广安大桥`, `광안리`, `Gwangalli Beach` |

</details>

### 3.5 P0 汇总

| region | P0 数量 |
|--------|---------|
| seoul | 17 |
| gyeonggi | 2 |
| incheon | 3 |
| busan | 4 |
| **合计** | **26** |

---

## 4. P1 — 第二批（14，审查后入库）

### 4.1 首尔延伸（6）

| slug | name_cn | name_ko | name_en | region | district | why_relevant | seed_priority | coords_status |
|------|---------|---------|---------|--------|----------|--------------|---------------|---------------|
| `ewha` | 梨花/梨大 | 이대 | Ewha Womans | seoul | 서대문구 | 新村辐射圈；女生租房与家教 | P1 | estimated |
| `wangsimni` | 往十里 | 왕십리 | Wangsimni | seoul | 성동구 | 换乘枢纽、合租 | P1 | estimated |
| `cheongnyangni` | 清凉里 | 청량리 | Cheongnyangni | seoul | 동대문구 | 华人批发、交通 | P1 | estimated |
| `mokdong` | 木洞 | 목동 | Mokdong | seoul | 양천구 | 家庭型华人社区 | P1 | estimated |
| `digital-media-city` | 上岩 DMC | 상암 DMC | DMC | seoul | 마포구 | 媒体/文创就业 | P1 | estimated |
| `lotte-world-tower` | 乐天塔/蚕室南 | 롯데타워 | Lotte Tower | seoul | 송파구 | 与蚕室区分细粒度 | P1 | estimated |

### 4.2 京畿延伸（4）

| slug | name_cn | name_ko | name_en | region | district | why_relevant | seed_priority | coords_status |
|------|---------|---------|---------|--------|----------|--------------|---------------|---------------|
| `bundang` | 分당 | 분당 | Bundang | gyeonggi | 성남시 | IT 从业者与家庭华人 | P1 | estimated |
| `yongin` | 龙仁 | 용인 | Yongin | gyeonggi | 용인시 | 爱宝/大学圈、郊区租房 | P1 | estimated |
| `pyeongtaek` | 平泽 | 평택 | Pyeongtaek | gyeonggi | 평택시 | 美军/物流相关华人打工 | P1 | estimated |
| `uijeongbu` | 议政府 | 의정부 | Uijeongbu | gyeonggi | 의정부시 | 北部华人餐饮与打工 | P1 | estimated |

### 4.3 仁川 / 釜山延伸（2）

| slug | name_cn | name_ko | name_en | region | district | why_relevant | seed_priority | coords_status |
|------|---------|---------|---------|--------|----------|--------------|---------------|---------------|
| `incheon-chinatown` | 仁川中华街 | 차이나타운 | Incheon Chinatown | incheon | 중구 | 旅游与华人商户 | P1 | estimated |
| `nampo` | 南浦/扎嘎其 | 남포/자갈치 | Nampo | busan | 중구 | 釜山老城区美食探店 | P1 | estimated |

### 4.4 广域市基础（2）

| slug | name_cn | name_ko | name_en | region | district | why_relevant | seed_priority | coords_status |
|------|---------|---------|---------|--------|----------|--------------|---------------|---------------|
| `daegu-dongseong` | 大邱东城路 | 동성로 | Daegu Dongseong | daegu | 중구 | 大邱最核心商圈 | P1 | estimated |
| `jeju-city` | 济州市区 | 제주시 | Jeju City | jeju | 제주시 | 济州华人旅游与长居 | P1 | estimated |

---

## 5. P2 — 延后基础区域（12）

满足大邱 / 大田 / 光州 / 济州除 P1 外的**最低覆盖**，避免广域市完全空白。

### 5.1 大邱（3）

| slug | name_cn | name_ko | name_en | region | district | why_relevant | seed_priority | coords_status |
|------|---------|---------|---------|--------|----------|--------------|---------------|---------------|
| `daegu-suseong` | 大邱寿城 | 수성구 | Daegu Suseong | daegu | 수성구 | 居住型华人社区 | P2 | estimated |
| `daegu-north` | 大邱北区 | 북구 | Daegu Buk-gu | daegu | 북구 | 高校与工业园打工 | P2 | estimated |
| `daegu-station` | 大邱站 | 대구역 | Daegu Station | daegu | 동구 | 交通换乘、短期停留 | P2 | estimated |

### 5.2 大田（3）

| slug | name_cn | name_ko | name_en | region | district | why_relevant | seed_priority | coords_status |
|------|---------|---------|---------|--------|----------|--------------|---------------|---------------|
| `daejeon-government` | 大田政府科城 | 정부청사 | Daejeon Govt. Complex | daejeon | 유성구 | 科研/公务员华人 | P2 | estimated |
| `daejeon-yuseong` | 大田儒城 | 유성구 | Daejeon Yuseong | daejeon | 유성구 | KAIST/大德圈 | P2 | estimated |
| `daejeon-station` | 大田站 | 대전역 | Daejeon Station | daejeon | 동구 | 枢纽、换乘信息 | P2 | estimated |

### 5.3 光州（3）

| slug | name_cn | name_ko | name_en | region | district | why_relevant | seed_priority | coords_status |
|------|---------|---------|---------|--------|----------|--------------|---------------|---------------|
| `gwangju-sangmu` | 光州尚武 | 상무지구 | Gwangju Sangmu | gwangju | 서구 | 光州核心商业区 | P2 | estimated |
| `gwangju-chonnam` | 光州全南大 | 전남대 | Chonnam Natl. Univ. | gwangju | 북구 | 留学生租房 | P2 | estimated |
| `gwangju-station` | 光州송정站 | 송정역 | Gwangju Songjeong | gwangju | 광산구 | KTX 枢纽 | P2 | estimated |

### 5.4 济州延伸（3）

| slug | name_cn | name_ko | name_en | region | district | why_relevant | seed_priority | coords_status |
|------|---------|---------|---------|--------|----------|--------------|---------------|---------------|
| `jeju-seogwipo` | 西归浦 | 서귀포 | Seogwipo | jeju | 서귀포시 | 南部旅游与打工度假 | P2 | estimated |
| `jeju-airport` | 济州机场 | 제주공항 | Jeju Airport | jeju | 제주시 | 入境/接机求助 | P2 | estimated |
| `jeju-nohyeong` | 济州老衡洞 | 노형동 | Jeju Nohyeong | jeju | 제주시 | 市区华人餐饮集中 | P2 | estimated |

---

## 6. 审查检查清单

在 Phase 1 migration 前，请逐项确认：

- [ ] P0 共 **26** 个，覆盖用户指定优先商圈
- [ ] 同一 `region` 内 `slug` 无重复
- [ ] `name_cn` 与韩圈历史 `posts.location` 高频词可对应（见 §7）
- [ ] 重叠商圈已标注（延世↔新村、高丽↔安岩、庆熙↔回基）
- [ ] `incheon-airport` 半径 5000m 不与 `bupyeong` 过度冲突（待坐标校准时验证）
- [ ] `coords_status` 全部为 `estimated`，校准计划已排期
- [ ] 产品/运营对 `why_relevant` 无异议

---

## 7. 与历史 `posts.location` 对照（回填参考）

| 历史 location 样例 | 建议映射 Area slug | match 预期 |
|--------------------|-------------------|------------|
| `建国大学` / `建大` | `konkuk` | high |
| `延世大学` | `yonsei` | high |
| `仁川机场` | `incheon-airport` | high |
| `首尔` / `釜山` | （仅 region，area NULL） | high |
| `首尔转租单间 近2号线` | `region=seoul`, area 待 NLP | low |
| `建大附近好吃烤肉` | `konkuk` | medium |

完整回填规则见 [region-hub-v1.md §13.4](./region-hub-v1.md)。

---

## 8. 已知重叠与待决事项

| 议题 | 说明 | 建议 |
|------|------|------|
| 延世 vs 新村 | 地理重叠，用户常混用 | 保留两 Area；定位时取半径内最近中心点 |
| 高丽/安岩 vs 城大/惠化 | 相邻学区 | P0 均保留；aliases 互不含对方全名 |
| 蚕室 vs 乐天塔 | 包含关系 | 蚕室 P0；乐天塔 P1 可选细化 |
| 安山 vs 新安 | 华人常统称安山 | `ansan` aliases 含 `新安` |
| `district` 是否入库 | 审查字段 | Phase 1 不入库；Phase 2 可选 `district_ko` |
| 坐标重叠 | 弘大/新村/延世中心距 < 2km | 校准阶段调整 `radius_m`，多命中取最近 |

---

## 9. 审查签字（留白）

| 角色 | 姓名 | 日期 | 结论 |
|------|------|------|------|
| 产品 | | | ☐ 通过 ☐ 需修改 |
| 运营 | | | ☐ 通过 ☐ 需修改 |
| 开发 | | | ☐ 通过 ☐ 需修改 |

修改意见：

```
（留白）
```

---

*审查通过后，按 [region-hub-v1.md §4.6](./region-hub-v1.md) 进入 Phase 1 migration（仅字典表 + P0 seed）。*
