# ─── Stage 1: Base ─────────────────────────────────────────────
FROM python:3.11-slim AS base

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ─── Stage 2: Dependencies ──────────────────────────────────────
FROM base AS deps

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ─── Stage 3: Production ────────────────────────────────────────
FROM base AS runner

COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY . .

ENV PYTHONPATH=/app

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]