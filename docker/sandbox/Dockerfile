# ─── OLAIS EVAL — Code Execution Sandbox ───────────────────────────────────
# Lightweight sandbox with multiple language runtimes.
# Runs as a non-root "sandbox" user with resource limits.

FROM python:3.11-slim

LABEL org.opencontainers.image.title="Olais Eval Sandbox"
LABEL org.opencontainers.image.description="Multi-language code execution sandbox for Olais Eval"
LABEL org.opencontainers.image.version="1.0.0"

# ── Install runtimes (minimal - no GUI deps) ──────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Node.js 20 LTS
    nodejs \
    npm \
    # C++ compiler
    g++ \
    # Java JDK (headless only - no GUI deps)
    openjdk-21-jdk-headless \
    # Runtime utility
    bc \
    && rm -rf /var/lib/apt/lists/*

# ── Verify installations ──────────────────────────────────────────────────
RUN python3 --version && node --version && g++ --version && java -version

# ── Create non-root sandbox user ──────────────────────────────────────────
RUN groupadd -r sandbox && \
    useradd -r -g sandbox -m -s /bin/bash sandbox

# ── Setup workspace directory ─────────────────────────────────────────────
RUN mkdir -p /tmp/workspace && chown sandbox:sandbox /tmp/workspace

# ── Copy runner script ────────────────────────────────────────────────────
COPY runner.sh /usr/local/bin/runner.sh
RUN chmod +x /usr/local/bin/runner.sh && chown sandbox:sandbox /usr/local/bin/runner.sh

# ── Default user ──────────────────────────────────────────────────────────
USER sandbox
WORKDIR /tmp/workspace

# ── Default command ───────────────────────────────────────────────────────
ENTRYPOINT ["/usr/local/bin/runner.sh"]
