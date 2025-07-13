# 🧠 Project Document: Agentic AI System (Whyte Houx / Space WH)

---

## Project Summary

**Space** is a modular, agentic AI platform built with LangGraph + LangChain, designed to orchestrate intelligent workflows across voice, web, messaging, and local interfaces. It supports real-time task execution, research, planning, and context-aware multi-modal interaction.

The platform revolves around a headless AI Agent connected to a ToolBox of intelligent modules like the Educator Tool and Master Planner Tool, each with defined workflows, memory, and task autonomy.

---

## 📚 Core Tech Stack & Documentation

| Layer | Tech / Framework | Purpose | Docs URL | App URL |
| --- | --- | --- | --- | --- |
| Agent Orchestration | **LangGraph** | State machine for reasoning flows | [Docs](https://docs.langchain.com/langgraph/) | [https://pypi.org/project/langgraph/](https://pypi.org/project/langgraph/) |
| Agent Framework | **LangChain** | Chains, tools, memory, RAG | [Docs](https://docs.langchain.com/docs/) | [https://pypi.org/project/langchain/](https://pypi.org/project/langchain/) |
| Vector Store | **FAISS / ChromaDB** | RAG database | [FAISS](https://github.com/facebookresearch/faiss), [Chroma](https://docs.trychroma.com/) | [https://pypi.org/project/faiss-cpu/](https://pypi.org/project/faiss-cpu/), [https://pypi.org/project/chromadb/](https://pypi.org/project/chromadb/) |
| LLM Integration | **OpenAI / Ollama / HF** | Text generation, embeddings | [OpenAI](https://platform.openai.com/docs), [HF](https://huggingface.co/docs) | [https://platform.openai.com/](https://platform.openai.com/), [https://ollama.com/](https://ollama.com/) |
| Web API Backend | **FastAPI** | Async API for frontends & bots | [Docs](https://fastapi.tiangolo.com/) | [https://pypi.org/project/fastapi/](https://pypi.org/project/fastapi/) |
| Web Frontend | **React** | Chat UI, STT/TTS, Uploads | [Docs](https://react.dev/) | [https://reactjs.org/](https://reactjs.org/) |
| Messaging Extensions | **Telegram / Twilio** | Messaging bot integration | [Telegram](https://core.telegram.org/bots/api), [Twilio](https://www.twilio.com/docs/whatsapp) | [https://core.telegram.org/](https://core.telegram.org/), [https://www.twilio.com/](https://www.twilio.com/) |
| Speech Interface | **Web Speech API** | Browser-native voice control | [Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) | Native |

---

## 🧰 ToolBox Modules (Core Defaults)

### 🎓 Educator Tool

**Function:** AI-powered research assistant and study guide creator.

**Workflow:**

1. Accept topic instruction from user.
2. Scrape web for academic resources, papers, YouTube lectures, notes.
3. Save results into a Temporary Workspace.
4. Ask user for study confirmation.
5. Generate study guide/outline.
6. Pass guide to Master Planner for scheduling.

**Key Components:**

- Web Scraper
- YouTube Summary Extractor (via API or LlamaIndex)
- PDF/Text parser
- Guide Generator Chain
- Temp Document Workspace

---

### 🗓 Master Planner Tool

**Function:** Schedules and automates tasks across digital ecosystem.

**Workflow:**

1. Accept tasks, reminders, meetings from any input source.
2. Sync with Google Calendar, local calendars.
3. Execute digital commands: send emails, messages, set alarms.
4. Interface with mobile/desktop services via APIs.

**Key Components:**

- Calendar Adapter (Google API, etc.)
- Email Connector (SMTP/IMAP)
- Task Handler
- Device Task Proxy (via desktop/mobile agents)

---

## 📐 System Architecture

**LangGraph Flow:**

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│ Web / Bot  ├────►│ LangGraph  ├────►│ ToolBox    │
└────┬───────┘     └────┬───────┘     └────┬───────┘
     │                ┌─▼─────────────┐   │
     ▼                │ RAG Retriever │   ▼
Input Text            └────┬──────────┘   ▼
                           ▼         ┌─────────────┐
                    ┌────────────┐  │MasterPlanner│
                    │EducatorTool│  └─────────────┘
                    └────────────┘

```

---

## ✅ Implementation Strategy

### 1. ToolBox Architecture

```python
class BaseTool:
    name: str = "base_tool"
    def run(self, input_text: str) -> str:
        raise NotImplementedError()

```

```python
class EducatorTool(BaseTool):
    name = "educator"
    def run(self, input_text):
        # Step 1: Search
        # Step 2: Save to temp
        # Step 3: Prompt user
        # Step 4: Return guide
        pass

```

```python
TOOLBOX_REGISTRY = {
    "educator": EducatorTool(),
    "planner": MasterPlannerTool(),
}

```

### 2. Context Memory Management

- Memory keyed by unique user ID
- Stored in Redis/Chroma/SQLite
- Includes: Active Tool, Tool State, Last Interaction

```json
{
  "user_id": "abc123",
  "active_tool": "educator",
  "tool_state": {
    "status": "awaiting_study_confirmation",
    "topic": "machine learning"
  }
}

```

### 3. Telegram / WhatsApp / Web Adapter

- Each bot connects to FastAPI route
- Each route transforms input into LangGraph node call

```python
@app.post("/telegram")
def telegram_webhook():
    user_id = get_user_id()
    input_text = extract_message()
    response = agent.run(user_id, input_text)
    return send_message(response)

```

---

## 📄 Knowledge Base Structure

```
/knowledge_base/
├── system_prompt.md
├── educator_tool.md
├── planner_tool.md
├── langgraph_flow.md
├── interface_sync.md
└── memory_management.md

```

### Sample: `system_prompt.md`

```
You are an AI Agent in the Whyte Houx platform. Your role is to:
1. Follow tool routing based on user needs.
2. Respect saved memory and ongoing tool sessions.
3. Never hallucinate or make assumptions beyond task scope.
4. Ask user to confirm before completing task transitions.

```

---

## ✅ Checklist of Tasks

### 📌 Core System Setup

- 

### 📦 Tool Modules

- 

### 🎛 Frontend

- 

### 📱 Messaging Integrations

- 

### 🔁 Context Management

- 

---

## 📜 AI Agent System Prompt

```
You are a headless AI Agent for the Whyte Houx platform.
You ALWAYS:
- Use user_id to load memory context
- Never guess a task outside the current tool
- Confirm with the user before switching tools or finalizing tasks
- Use TOOLBOX_REGISTRY to route tools
- Log all outputs and inputs in session history

```

---

## ✅ Final Notes

This document serves as the **master reference** for building and scaling the Whyte Houx Agentic AI System. All modules, strategies, and checkpoints are aligned with agentic logic, human-in-the-loop design, and platform extensibility.

Let’s now move into implementation per section. Would you like me to scaffold any specific modules first?

[✅ PROJECT TASK & MICRO-TASK BREAKDOWN](%F0%9F%A7%A0%20Project%20Document%20Agentic%20AI%20System%20(Whyte%20Houx%20S%201d4c17f82b4880d4ba29d884175a1835/%E2%9C%85%20PROJECT%20TASK%20&%20MICRO-TASK%20BREAKDOWN%201d4c17f82b48803e8a82cfad40b7b4ea.md)