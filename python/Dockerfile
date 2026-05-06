# syntax=docker/dockerfile:1.7

# ─── Builder ───────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder
WORKDIR /app

# System deps for spaCy + sentence-transformers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps into /install — copied to runner for clean layer separation
COPY requirements.txt .
RUN pip install --upgrade pip \
 && pip install --prefix=/install --no-cache-dir -r requirements.txt

# Download spaCy model into /install
RUN python -m spacy download en_core_web_sm --target /install/lib/python3.12/site-packages

# ─── Runner ────────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runner
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Non-root user for security
RUN addgroup --gid 1001 appgroup \
 && adduser  --uid 1001 --gid 1001 --no-create-home --disabled-password appuser

COPY --from=builder /install /usr/local
COPY --chown=appuser:appgroup . .

USER appuser
EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"

CMD ["uvicorn", "agent_runtime.main:app", "--host", "0.0.0.0", "--port", "8001"]
