# Work AI Assistant（AI 工作助手）

这是一个基于 RAG（检索增强生成）的自托管全栈 AI 工作助手。你可以上传工作文档，系统会基于知识库内容进行问答。

## 功能特性

- **知识库管理**：支持上传 PDF、Word、Excel、PPT、TXT、MD、CSV 文件
- **RAG 智能问答**：回答优先基于已上传文档内容
- **流式响应**：通过 SSE 实时展示生成结果
- **明暗主题**：支持浅色与深色主题切换
- **可配置设置**：支持配置模型地址、模型名称、温度等参数
- **桌面端打包**：支持将前端、后端和 Electron 桌面端一起构建

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + TailwindCSS |
| 后端 | Python FastAPI |
| 向量检索 | scikit-learn TF-IDF |
| 存储 | 文件存储（JSON + numpy/scipy） |
| 大模型接口 | OpenAI 兼容 API |
| 桌面端 | Electron |

## 环境要求

- **Python**：3.10 或更高版本
- **Node.js**：18 或更高版本
- **npm**：9 或更高版本

## 快速开始

### 1. 克隆仓库

```bash
git clone <repo-url>
cd work-ai-assistant
```

### 2. 安装依赖

```bash
npm run install:all
```

该命令会安装：

- 后端 Python 依赖
- 前端 npm 依赖
- 桌面端 npm 依赖

### 3. 启动后端

```bash
npm run dev:backend
```

后端默认启动在 `http://localhost:8000`。

### 4. 启动前端

打开一个新的终端窗口后执行：

```bash
npm run dev:frontend
```

前端默认启动在 `http://localhost:5173`。

### 5. 打开并使用

1. 在浏览器中访问 `http://localhost:5173`
2. 进入 **知识库** 页面上传工作文档
3. 进入 **智能对话** 页面开始提问
4. 在 **设置** 页面中配置模型地址、模型名称和其他参数

## 构建说明

### 构建桌面端

```bash
npm run build:desktop
```

该命令会先构建前端和后端，再打包当前宿主平台对应的桌面应用。

### 一键完整构建

```bash
npm run build
```

该命令会完成：

1. 前端生产构建
2. 后端 PyInstaller 打包
3. Electron 桌面端打包

构建产物位置：

- 后端产物：`backend/dist/backend`
- 桌面端产物：`release/`

### GitHub Pages 构建

如果要构建 GitHub Pages 版本，请设置：

```bash
VITE_BASE_PATH=/work-ai-assistant/ npm run build
```

默认情况下，前端构建基础路径为 `/`。

## 默认模型配置

- **API 地址**：`https://xiaozhi.aifuture.icu`
- **模型名称**：`gpt-4o`
- **温度**：`0.7`

这些参数都可以在设置页面中修改。

## 项目结构

```text
work-ai-assistant/
├── README.md
├── frontend/              # React + TypeScript 前端
│   ├── src/
│   │   ├── components/    # UI 组件
│   │   ├── contexts/      # React 上下文
│   │   ├── hooks/         # 自定义 Hook
│   │   ├── types/         # TypeScript 类型
│   │   └── utils/         # 工具函数
├── backend/               # FastAPI 后端
│   ├── routers/           # API 路由
│   ├── services/          # 业务逻辑
│   ├── models/            # Pydantic 模型
│   ├── tests/             # 后端测试
│   └── data/              # 本地数据目录
├── desktop/               # Electron 桌面端
└── scripts/               # 构建与辅助脚本
```

## 许可证

MIT
