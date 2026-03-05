# AI 设计稳定性与风险评估系统（MVP）

一个面向 **B2B 设计评审 / 版本对比** 的 AI Dashboard：上传 2–3 个设计版本，选择行业 + Persona + 权重，一键生成“虚拟受访者真实反馈 + 文本审计”，并输出版本对比（加权总分 / 稳定性 / 置信区间）。

---

## Demo
- Repo: https://github.com/jiayi-jin/ai-risk-dashboard-mvp
- ![Demo](docs/demo.gif)

---

## What it does
### Dashboard
- 展示历史运行记录（时间 / 行业 / persona / 状态）
- 一键新建分析（New Analysis）

### New Analysis
- 上传图片：2–3 张（最多 3 张，自动标为 A/B/C）
- 选择行业：fmcg / beauty / food
- Persona：固定 3 个模板（后续可扩展可编辑/随机生成）
- 权重配置：喜欢度 / 购买意愿 / 信任度（总和=100）
- Start analysis：真实调用 API，生成报告

### Report
- 版本对比：加权总分、稳定性（标准差）、95% 置信区间
- 抽样展示：
  - Agent A（GPT）：以 Persona 口吻输出“像真人”的评价 + 0–100 打分
  - Agent B（Gemini）：审计 A 的输出（像真人程度 / Persona 匹配度 / 具体性）
- 输出 JSON 可回放（便于 debug 与复现）

---

## Screenshots

![Dashboard](docs/screenshots/dashboard.png)
![New Analysis](docs/screenshots/new.png)
![Report](docs/screenshots/report.png)

---

## Why it’s credible（MVP 版本的可信度来源）
- **配置可追溯**：行业 / Persona / 权重 / 模型选择与输出 JSON 都可回看
- **对比友好**：同一配置下对多个版本做对比，减少“单次偶然结果”
- **审计机制**：Agent B 对 Agent A 的文本进行审计，提升输出可信度与一致性
- **可扩展**：后续可加入 robustness（扰动性/鲁棒性）测试、多轮采样、惩罚机制等

---

## Tech Stack
- Next.js (App Router)
- Supabase (Postgres + Storage)
- OpenAI (Agent A)
- Gemini (Agent B)

---

## Quickstart（Local）
### 1) Install
```bash
npm i
