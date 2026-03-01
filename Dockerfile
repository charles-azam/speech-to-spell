FROM python:3.13-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install dependencies first (cached layer)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Copy source code and install the project
COPY src/ src/
RUN uv sync --frozen --no-dev

# Copy pre-generated sound effects
COPY sounds_cache/ sounds_cache/

# Run uvicorn via uv
CMD ["uv", "run", "--no-sync", "uvicorn", "speech_to_spell.main:app", "--host", "0.0.0.0", "--port", "8000"]
