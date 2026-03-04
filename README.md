# Work AI Assistant (AI 工作助手)

A self-hosted, full-stack AI assistant powered by RAG (Retrieval-Augmented Generation). Upload your work documents, and the AI will answer questions based on your knowledge base.

## Features

- **Knowledge Base Management**: Upload PDF, Word, Excel, PPT, TXT, MD, CSV files
- **RAG-Powered Chat**: AI answers grounded in your uploaded documents
- **Streaming Responses**: Real-time token-by-token display via SSE
- **Light/Dark Theme**: Fully polished dual theme support
- **Configurable Settings**: API endpoint, model, temperature, and more

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS |
| Backend | Python FastAPI |
| Embedding | scikit-learn TF-IDF |
| Storage | File-based (JSON + numpy) |
| LLM | OpenAI-compatible API |

## Requirements

- **Python**: 3.10 or higher
- **Node.js**: 18 or higher
- **npm**: 9 or higher

## Quick Start (快速开始)

### 1. Clone the project

```bash
git clone <repo-url>
cd work-ai-assistant
```

### 2. Start the backend (启动后端)

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The backend will start at `http://localhost:8000`.

### 3. Start the frontend (启动前端)

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:5173`.

### 4. Open and use (打开使用)

1. Open `http://localhost:5173` in your browser
2. Navigate to **知识库** (Knowledge Base) and upload your work documents
3. Go to **智能对话** (Chat) and start asking questions
4. Configure API settings in **设置** (Settings) if needed

## Default API Configuration

- **API Base URL**: `https://xiaozhi.aifuture.icu`
- **Model**: `gpt-4o`
- **Temperature**: `0.7`

All settings can be changed in the Settings panel.

## Project Structure

```
work-ai-assistant/
├── README.md
├── frontend/          # React + TypeScript frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── contexts/    # React contexts
│   │   ├── hooks/       # Custom hooks
│   │   ├── types/       # TypeScript types
│   │   └── utils/       # Utilities
│   └── ...
├── backend/           # Python FastAPI backend
│   ├── routers/       # API route handlers
│   ├── services/      # Business logic
│   ├── models/        # Pydantic schemas
│   └── data/          # File-based storage
└── scripts/           # Startup scripts
```

## License

MIT
