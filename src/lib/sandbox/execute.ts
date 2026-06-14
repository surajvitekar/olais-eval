/**
 * ─── OLAIS EVAL — Docker Sandbox Code Executor ──────────────────────────
 * Spawns a Docker container to execute code in an isolated sandbox.
 *
 * The container is created with:
 *   - Memory limit: 256MB
 *   - CPU limit:    0.5 cores
 *   - Network:      none (disabled)
 *   - Timeout:      30 seconds (container killed after that)
 *   - User:         sandbox (non-root)
 *
 * Usage:
 *   import { executeCode } from "@/lib/sandbox/execute"
 *   const result = await executeCode("console.log('hi')", "javascript")
 *   // => { stdout: "hi\n", stderr: "", exitCode: 0, executionTime: 0.042, error: null }
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { spawn } from "child_process"

// ── Types ─────────────────────────────────────────────────────────────────

export interface ExecutionResult {
  stdout: string
  stderr: string
  exitCode: number
  executionTime: number
  error: string | null
}

export type SupportedLanguage = "python" | "javascript" | "cpp" | "java"

// ── Configuration ─────────────────────────────────────────────────────────

const DOCKER_IMAGE = process.env.SANDBOX_IMAGE || "olais-sandbox"
const CONTAINER_TIMEOUT_MS = 35_000 // 35s to allow for container startup
const MEMORY_LIMIT = "256m"
const CPU_LIMIT = "0.5"
const TIMEOUT_SECONDS = 30

// ── Executor ──────────────────────────────────────────────────────────────

/**
 * Execute code in the Docker sandbox container.
 *
 * @param code     - Source code to execute
 * @param language - Language runtime: "python" | "javascript" | "cpp" | "java"
 * @returns        - ExecutionResult with stdout, stderr, exitCode, etc.
 */
export async function executeCode(
  code: string,
  language: SupportedLanguage
): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()

    // Map aliases to canonical names
    const lang = normalizeLanguage(language)

    // Build the Docker run command
    const args = [
      "run",
      "--rm",                     // Remove container after execution
      "--memory", MEMORY_LIMIT,   // 256 MB memory limit
      "--cpus", CPU_LIMIT,        // 0.5 CPU cores
      "--network", "none",        // No network access
      `--timeout`, `${TIMEOUT_SECONDS}`, // Kill after 30s
      "--log-driver", "none",     // Reduce log overhead
      "-i",                       // Interactive (stdin)
      DOCKER_IMAGE,
    ]

    const docker = spawn("docker", args, {
      stdio: ["pipe", "pipe", "pipe"],
    })

    // Timeout watchdog
    const killTimer = setTimeout(() => {
      docker.kill("SIGKILL")
      // Resolve with timeout error after Docker is dead
      setTimeout(() => {
        resolve({
          stdout: "",
          stderr: "",
          exitCode: 124,
          executionTime: TIMEOUT_SECONDS,
          error: `Execution timed out after ${TIMEOUT_SECONDS}s`,
        })
      }, 500)
    }, CONTAINER_TIMEOUT_MS)

    // Build JSON payload
    const payload = JSON.stringify({ code, language: lang })

    // Send code to container stdin
    docker.stdin!.write(payload)
    docker.stdin!.end()

    // Collect stdout
    const stdoutChunks: Buffer[] = []
    docker.stdout!.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk)
    })

    // Collect stderr
    const stderrChunks: Buffer[] = []
    docker.stderr!.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk)
    })

    // Handle completion
    docker.on("close", (exitCode: number | null) => {
      clearTimeout(killTimer)

      const stdout = Buffer.concat(stdoutChunks).toString("utf-8").trim()
      const stderr = Buffer.concat(stderrChunks).toString("utf-8").trim()
      const executionTime = (Date.now() - startTime) / 1000

      // Try to parse JSON result from stdout
      try {
        const trimmed = stdout.trim()
        // The runner outputs JSON as the last line of stdout
        const lines = trimmed.split("\n")
        let jsonStr = lines[lines.length - 1]

        // If stdout contained actual program output, the JSON result
        // is the last line. Find the last JSON object.
        const jsonMatch = trimmed.match(/\{[\s\S]*"stdout"[\s\S]*"stderr"[\s\S]*"exitCode"[\s\S]*\}$/)
        if (jsonMatch) {
          jsonStr = jsonMatch[0]
        }

        const result: ExecutionResult = JSON.parse(jsonStr)
        resolve(result)
      } catch {
        // If JSON parsing fails, return raw output
        resolve({
          stdout,
          stderr,
          exitCode: exitCode ?? 1,
          executionTime,
          error: stderr || null,
        })
      }
    })

    // Handle process errors
    docker.on("error", (err: Error) => {
      clearTimeout(killTimer)
      reject(new Error(`Docker spawn failed: ${err.message}`))
    })
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────

function normalizeLanguage(lang: string): SupportedLanguage {
  const normalized = lang.toLowerCase().trim()
  switch (normalized) {
    case "py":
    case "python":
      return "python"
    case "js":
    case "javascript":
    case "node":
    case "nodejs":
      return "javascript"
    case "cpp":
    case "c++":
    case "cplusplus":
      return "cpp"
    case "java":
      return "java"
    default:
      return "python" // safe fallback
  }
}
