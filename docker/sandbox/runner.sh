#!/bin/bash
# ─── OLAIS EVAL — Code Execution Runner ──────────────────────────────────
# Receives JSON input on stdin with { code, language }.
# Writes code to a temp file, compiles if needed, executes with timeout
# and memory limits, then outputs JSON result to stdout.
#
# Expected input (stdin): {"code": "...", "language": "python|javascript|cpp|java"}
# Output (stdout):        {"stdout": "...", "stderr": "...", "exitCode": N, "executionTime": N.N, "error": "..."|null}
#
# Resource limits:
#   - Timeout: 30 seconds (handled by timeout command)
#   - Memory: 256MB (ulimit -v)
#   - No network (enforced by Docker --network=none)
# ═══════════════════════════════════════════════════════════════════════════

set -o pipefail

# ── Configuration ─────────────────────────────────────────────────────────
TIMEOUT_SECONDS=30
MEMORY_LIMIT_KB=$((256 * 1024))  # 256 MB
# ═══════════════════════════════════════════════════════════════════════════

# ── Read input ────────────────────────────────────────────────────────────
INPUT_RAW=""
while IFS= read -r line; do
  INPUT_RAW+="$line"$'\n'
done
INPUT_RAW="${INPUT_RAW%$'\n'}"  # Remove trailing newline

# Parse JSON using python3 (available in the image)
CODE=$(echo "$INPUT_RAW" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get('code', ''))
except Exception as e:
    print('', end='')
    sys.exit(1)
")

LANGUAGE=$(echo "$INPUT_RAW" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get('language', 'python').lower())
except Exception as e:
    print('python', end='')
    sys.exit(1)
")

# ── Input validation ──────────────────────────────────────────────────────
if [ -z "$CODE" ]; then
  echo '{"stdout":"","stderr":"No code provided","exitCode":1,"executionTime":0,"error":"No code provided"}'
  exit 0
fi

# ── Set memory limit ──────────────────────────────────────────────────────
ulimit -v $MEMORY_LIMIT_KB 2>/dev/null
ulimit -s $MEMORY_LIMIT_KB 2>/dev/null

# ── Create temp file ──────────────────────────────────────────────────────
WORK_DIR=$(mktemp -d /tmp/workspace/run_XXXXXX)
trap 'rm -rf "$WORK_DIR"' EXIT

TIMEFILE="$WORK_DIR/time.txt"
STDOUT_FILE="$WORK_DIR/stdout.txt"
STDERR_FILE="$WORK_DIR/stderr.txt"

# Language-specific execution
START_TIME=$(date +%s%N)

case "$LANGUAGE" in
  python|py)
    # Python — interpreted
    SCRIPT_FILE="$WORK_DIR/solution.py"
    printf '%s\n' "$CODE" > "$SCRIPT_FILE"
    /usr/bin/time -p timeout $TIMEOUT_SECONDS python3 "$SCRIPT_FILE" \
      > "$STDOUT_FILE" 2>"$STDERR_FILE.tmp"
    EXIT_CODE=$?
    ;;

  javascript|js|node)
    # JavaScript — Node.js
    SCRIPT_FILE="$WORK_DIR/solution.js"
    printf '%s\n' "$CODE" > "$SCRIPT_FILE"
    /usr/bin/time -p timeout $TIMEOUT_SECONDS node "$SCRIPT_FILE" \
      > "$STDOUT_FILE" 2>"$STDERR_FILE.tmp"
    EXIT_CODE=$?
    ;;

  cpp|c++|cplusplus)
    # C++ — compile then run
    SOURCE_FILE="$WORK_DIR/solution.cpp"
    BINARY_FILE="$WORK_DIR/solution"
    printf '%s\n' "$CODE" > "$SOURCE_FILE"
    g++ -std=c++17 -O2 -o "$BINARY_FILE" "$SOURCE_FILE" 2>"$STDERR_FILE.tmp"
    COMPILE_EXIT=$?
    if [ $COMPILE_EXIT -ne 0 ]; then
      STDERR_CONTENT=$(cat "$STDERR_FILE.tmp" 2>/dev/null)
      END_TIME=$(date +%s%N)
      ELAPSED=$(echo "scale=3; ($END_TIME - $START_TIME) / 1000000000" | bc)
      echo "{\"stdout\":\"\",\"stderr\":$(echo "$STDERR_CONTENT" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))"),\"exitCode\":$COMPILE_EXIT,\"executionTime\":$ELAPSED,\"error\":\"Compilation error\"}"
      exit 0
    fi
    /usr/bin/time -p timeout $TIMEOUT_SECONDS "$BINARY_FILE" \
      > "$STDOUT_FILE" 2>"$STDERR_FILE.tmp"
    EXIT_CODE=$?
    ;;

  java)
    # Java — compile then run
    SOURCE_FILE="$WORK_DIR/Solution.java"
    printf '%s\n' "$CODE" > "$SOURCE_FILE"
    javac "$SOURCE_FILE" 2>"$STDERR_FILE.tmp"
    COMPILE_EXIT=$?
    if [ $COMPILE_EXIT -ne 0 ]; then
      STDERR_CONTENT=$(cat "$STDERR_FILE.tmp" 2>/dev/null)
      END_TIME=$(date +%s%N)
      ELAPSED=$(echo "scale=3; ($END_TIME - $START_TIME) / 1000000000" | bc)
      echo "{\"stdout\":\"\",\"stderr\":$(echo "$STDERR_CONTENT" | python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))"),\"exitCode\":$COMPILE_EXIT,\"executionTime\":$ELAPSED,\"error\":\"Compilation error\"}"
      exit 0
    fi
    /usr/bin/time -p timeout $TIMEOUT_SECONDS java -cp "$WORK_DIR" Solution \
      > "$STDOUT_FILE" 2>"$STDERR_FILE.tmp"
    EXIT_CODE=$?
    ;;

  *)
    # Unknown language
    echo "{\"stdout\":\"\",\"stderr\":\"Unsupported language: $LANGUAGE\",\"exitCode\":1,\"executionTime\":0,\"error\":\"Unsupported language: $LANGUAGE\"}"
    exit 0
    ;;
esac

END_TIME=$(date +%s%N)
ELAPSED=$(echo "scale=3; ($END_TIME - $START_TIME) / 1000000000" | bc)

# ── Read outputs ──────────────────────────────────────────────────────────
STDOUT_CONTENT=""
if [ -f "$STDOUT_FILE" ]; then
  STDOUT_CONTENT=$(cat "$STDOUT_FILE")
fi

STDERR_CONTENT=""
if [ -f "$STDERR_FILE.tmp" ]; then
  # Filter out /usr/bin/time output from stderr (we capture it separately)
  STDERR_CONTENT=$(grep -v "^Command exited with" "$STDERR_FILE.tmp" 2>/dev/null || true)
fi

# Check for timeout
ERROR_MSG=null
if [ $EXIT_CODE -eq 124 ]; then
  ERROR_MSG="Execution timed out after ${TIMEOUT_SECONDS}s"
fi

# ── Output JSON result ────────────────────────────────────────────────────
python3 -c "
import json, sys

stdout = '''$STDOUT_CONTENT'''
stderr = '''$STDERR_CONTENT'''

# Escape properly for JSON
result = {
    'stdout': stdout,
    'stderr': stderr,
    'exitCode': $EXIT_CODE,
    'executionTime': float($ELAPSED),
    'error': $ERROR_MSG
}
print(json.dumps(result))
"
exit 0
