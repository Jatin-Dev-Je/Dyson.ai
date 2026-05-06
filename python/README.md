# Dyson Agent Runtime

Python microservice for the Dyson agentic studio. Handles all ML-native workloads — LangGraph agent orchestration, spaCy NLP, and local embeddings.

Called by the TypeScript Fastify backend via HTTP. Runs on port **8001**.

## Stack

| Layer | Library | Why |
|-------|---------|-----|
| Web framework | FastAPI + uvicorn | Async, automatic OpenAPI, Pydantic v2 |
| Agent orchestration | LangGraph | Stateful agents with branching + resumability |
| LLM | Gemini Flash (LangChain) | Temperature 0, structured output |
| Embeddings | sentence-transformers | Free, local, no API key, CPU-only |
| NLP | spaCy | Entity extraction, decision detection |
| Validation | Pydantic v2 | Matches TypeScript Zod philosophy |
| HTTP client | httpx | Async calls to Dyson API |

## Quick start

```bash
cd python

# Create virtualenv
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# Install deps
pip install -r requirements.txt

# Download spaCy model
python -m spacy download en_core_web_sm

# Configure
cp .env.example .env
# Set DYSON_API_URL and GEMINI_API_KEY

# Run
uvicorn agent_runtime.main:app --reload --port 8001
```

Open `http://localhost:8001/docs` (set `DEBUG=true`).

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/health` | Liveness probe |
| `GET`  | `/health/ready` | Readiness — checks Dyson API reachability |
| `POST` | `/agents/postmortem` | Generate post-mortem from incident description |
| `POST` | `/agents/pr-review` | Review PR against company memory |
| `POST` | `/agents/detect-decision` | Detect if text contains a decision (spaCy) |
| `POST` | `/ml/embed` | Embed texts with local sentence-transformers |

## Agents

### Post-mortem agent

LangGraph pipeline (4 nodes):

```
gather_context → analyse_timeline → identify_root_cause → generate_output
```

1. **gather_context** — queries Dyson memory for related incidents + WHY engine
2. **analyse_timeline** — LLM extracts ordered timeline of events
3. **identify_root_cause** — LLM identifies root cause + contributing factors
4. **generate_output** — assembles structured post-mortem with action items

Typical latency: **15–30 seconds**. Returns structured document with sections, action items, and related past incidents.

### PR Review agent

```
gather_context → generate_comments
```

Searches Dyson memory for decisions and constraints related to the PR. Returns typed comments (warning/info/decision/constraint) with severity labels.

### Decision detector

spaCy + pattern matching. Detects whether a Slack message or GitHub comment contains a decision. Used by the ingestion pipeline for automatic memory capture.

## Tests

```bash
pytest                    # all tests
pytest tests/test_ml.py   # ML pipeline unit tests (fast, no deps)
pytest tests/test_api.py  # FastAPI integration tests
pytest --cov=agent_runtime --cov-report=term-missing
```

## Docker

```bash
docker build -t dyson-agent-runtime .
docker run -p 8001:8001 --env-file .env dyson-agent-runtime
```
