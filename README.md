## AI 设计稳定性与风险评估系统（MVP）

一个基于 Next.js App Router 的小型 Dashboard，用于：

- 上传 2-3 张包装设计图（A/B/C）
- 选择行业与 Persona 组合
- 配置喜欢度 / 购买意愿 / 信任度权重
- 真实调用双 Agent：
  - Agent A（OpenAI）根据 persona 对图片给出“像真人的评价 + 打分”
  - Agent B（Gemini）审计 Agent A 的文本，打分其“像真人程度 & persona 匹配度”
- 生成分析报告，展示多版本得分与抽样文本

### 1. 环境准备

1. 安装依赖：

```bash
npm install
```

2. 复制环境变量模板：

```bash
cp .env.example .env.local
```

3. 在 `.env.local` 中填写你的密钥：

- `OPENAI_API_KEY`：OpenAI API Key（建议使用支持图像输入的最新模型）
- `GEMINI_API_KEY`：Google Gemini API Key
- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目 URL
- `SUPABASE_SERVICE_ROLE_KEY`：Supabase Service Role Key（仅在服务端使用）
- `SUPABASE_STORAGE_BUCKET`：在 Storage 中创建的公开 bucket 名称，例如 `designs`

> 注意：`.env.local` 不应提交到版本库。

### 2. Supabase 配置

在你的 Supabase 项目中：

1. 创建表 `analyses`（可通过 SQL Editor 执行）：

```sql
create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  industry text not null,
  variant_count int not null,
  personas jsonb not null,
  weights jsonb not null,
  result jsonb,
  status text default 'pending'
);

create index if not exists analyses_created_at on analyses(created_at desc);
```

2. 在 Storage 中创建公开 bucket（如：`designs`），并在 `.env.local` 中保持同名。

### 3. 本地运行

```bash
npm run dev
```

然后在浏览器访问 `http://localhost:3000`：

- `Dashboard`：查看历史分析记录、新建分析入口
- `新建分析`：上传图片、选择行业与 Persona、设置权重并启动分析
- 报告页：从 Dashboard 或分析完成后跳转，查看抽样文本与评分

### 4. 注意事项

- 当前版本按「1 轮 × 每 persona 5 人」真实调用模型，结构已预留为后续扩展多轮模拟。
- 若 OpenAI / Gemini 或 Supabase 任一未配置，相关功能会报错或提示，请检查 `.env.local`。
- 本项目主要面向早期设计风险筛选与决策支持，不用于真实销量预测或替代用户调研。

