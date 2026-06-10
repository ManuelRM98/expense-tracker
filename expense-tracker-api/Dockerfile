# Multi-stage build. The final (default) stage is production-safe — no --reload
# (DOCKER-01/SEC-03). docker-compose.yml selects the `dev` target explicitly.
FROM python:3.14-slim AS base
WORKDIR /app
# DEP-02: Copy both the human-edited direct-deps file and the fully-pinned lock file.
# Production install uses the lock file for reproducible builds.
COPY requirements.txt requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock
COPY . .
EXPOSE 8000

# Development: hot-reload + dev dependencies (used by docker-compose.yml via target: dev)
FROM base AS dev
COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements-dev.txt
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production (default when building without --target)
FROM base AS prod
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
