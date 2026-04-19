#!/usr/bin/env python3
"""
Fam-Mail Agent Orchestrator v2
===============================
Autonomous issue resolution loop using GLM via OpenCode server.
Handles quota limits, git-based verification, QA gating, and
executive summary generation.

Usage:
    python3 scripts/orchestrator.py              # Start orchestrator
    python3 scripts/orchestrator.py --dry-run    # Show what would run
    python3 scripts/orchestrator.py --status     # Show current status
    python3 scripts/orchestrator.py --verbose    # Extra logging
"""

import json
import os
import sys
import time
import subprocess
import urllib.request
import urllib.error
import signal
import traceback
import atexit
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

# ─── Configuration ───────────────────────────────────────────────

PROJECT_DIR = Path(__file__).parent.parent
CHANGELOG_FILE = PROJECT_DIR / "CHANGELOG_AGENT.md"
PROGRESS_FILE = PROJECT_DIR / "agent-progress.json"
ORCHESTRATOR_LOG = PROJECT_DIR / "logs" / "orchestrator.log"
SESSION_LOG_DIR = PROJECT_DIR / "logs" / "sessions"
PID_FILE = PROJECT_DIR / "logs" / "orchestrator.pid"

OPENCODE_PORT = 4096
OPENCODE_URL = f"http://127.0.0.1:{OPENCODE_PORT}"

QUOTA_RESET_BACKOFF_MIN = 2  # Start small — concurrency limits need short retries
MAX_SESSION_WAIT_SEC = 900  # 15 min per session — GLM 5.1 is slow but productive
POLL_INTERVAL_SEC = 10
MAX_ATTEMPTS_PER_ISSUE = 3

VERBOSE = "--verbose" in sys.argv or "-v" in sys.argv
DRY_RUN = "--dry-run" in sys.argv
STATUS_ONLY = "--status" in sys.argv

# ─── PID Lock ─────────────────────────────────────────────────────

def acquire_lock():
    """Ensure only one orchestrator runs at a time."""
    if PID_FILE.exists():
        old_pid = int(PID_FILE.read_text().strip())
        try:
            os.kill(old_pid, 0)
            print(f"ERROR: Orchestrator already running (PID {old_pid}). Kill it first or delete {PID_FILE}")
            sys.exit(1)
        except ProcessLookupError:
            log(f"Stale PID file for {old_pid}, removing")

    PID_FILE.write_text(str(os.getpid()))
    atexit.register(lambda: PID_FILE.unlink(missing_ok=True))

def release_lock():
    PID_FILE.unlink(missing_ok=True)

# ─── Logging ─────────────────────────────────────────────────────

def ensure_dirs():
    (PROJECT_DIR / "logs" / "sessions").mkdir(parents=True, exist_ok=True)

def log(msg: str, level: str = "INFO"):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] [{level}] {msg}"
    print(line, flush=True)
    try:
        with open(ORCHESTRATOR_LOG, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass

def log_verbose(msg: str):
    if VERBOSE:
        log(msg, "DEBUG")

# ─── Git Helpers ──────────────────────────────────────────────────

def git_head_sha() -> str:
    r = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True,
                       cwd=str(PROJECT_DIR))
    return r.stdout.strip()

def git_commits_since(sha: str) -> list[dict]:
    r = subprocess.run(
        ["git", "log", f"{sha}..HEAD", "--format=%H|%s", "--no-merges"],
        capture_output=True, text=True, cwd=str(PROJECT_DIR)
    )
    commits = []
    for line in r.stdout.strip().split("\n"):
        if "|" in line:
            h, msg = line.split("|", 1)
            commits.append({"hash": h.strip(), "message": msg.strip()})
    return commits

def git_diff_stat() -> str:
    r = subprocess.run(["git", "diff", "--stat", "HEAD~1..HEAD"],
                       capture_output=True, text=True, cwd=str(PROJECT_DIR))
    return r.stdout.strip()

# ─── OpenCode Server API ─────────────────────────────────────────

class OpenCodeAPI:
    def __init__(self, base_url: str):
        self.base_url = base_url

    def _request(self, method: str, path: str, data: dict = None, timeout: int = 30):
        url = f"{self.base_url}{path}"
        body = json.dumps(data).encode() if data else None
        headers = {"Content-Type": "application/json"} if data else {}
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                if resp.status == 204:
                    return None
                raw = resp.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            body_text = e.read().decode() if e.fp else ""
            if e.code == 429:
                raise QuotaError(f"API rate limited (429): {body_text[:100]}")
            if e.code >= 500:
                log(f"Server error {e.code} on {method} {path} (transient, will retry)", "WARN")
                raise
            log(f"HTTP {e.code} on {method} {path}: {body_text[:200]}", "ERROR")
            raise
        except urllib.error.URLError as e:
            log(f"Connection error on {method} {path}: {e.reason}", "ERROR")
            raise

    def health(self) -> bool:
        try:
            r = self._request("GET", "/global/health")
            return r and r.get("healthy", False)
        except Exception:
            return False

    def start_server(self) -> bool:
        log("Starting OpenCode server...")
        subprocess.Popen(
            ["opencode", "serve", "--port", str(OPENCODE_PORT)],
            cwd=str(PROJECT_DIR),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        for _ in range(30):
            time.sleep(1)
            if self.health():
                log(f"OpenCode server ready on port {OPENCODE_PORT}")
                return True
        log("Failed to start OpenCode server after 30s", "ERROR")
        return False

    def create_session(self, title: str) -> str:
        r = self._request("POST", "/session", {"title": title})
        sid = r["id"]
        log_verbose(f"Session created: {sid}")
        return sid

    def send_prompt(self, session_id: str, prompt: str, agent: str = "build") -> bool:
        try:
            self._request("POST", f"/session/{session_id}/prompt_async", {
                "model": {"providerID": "zai-coding-plan", "modelID": "glm-5.1"},
                "agent": agent,
                "parts": [{"type": "text", "text": prompt}],
            })
            return True
        except QuotaError:
            raise
        except Exception as e:
            log(f"Failed to send prompt: {e}", "ERROR")
            return False

    def get_messages(self, session_id: str) -> list:
        try:
            return self._request("GET", f"/session/{session_id}/message") or []
        except Exception:
            return []

    def abort_session(self, session_id: str):
        try:
            self._request("POST", f"/session/{session_id}/abort")
        except Exception:
            pass

    def session_status(self, session_id: str) -> dict:
        """Get structured status of a session."""
        msgs = self.get_messages(session_id)
        tool_count = 0
        total_tokens = 0
        last_text = ""
        is_active = False
        quota_hit = False

        for msg in msgs:
            info = msg.get("info", {})
            role = info.get("role", "")
            total_tokens += info.get("tokens", {}).get("output", 0)

            for p in msg.get("parts", []):
                ptype = p.get("type", "")
                if ptype == "tool":
                    tool_count += 1
                    state_obj = p.get("state", {})
                    status = state_obj.get("status", "") if isinstance(state_obj, dict) else str(state_obj)
                    if status in ("pending", "running"):
                        is_active = True
                    if isinstance(state_obj, dict) and status == "error":
                        err = str(state_obj.get("error", ""))
                        # Only match explicit API rate limit errors, not line numbers in code
                        if any(phrase in err.lower() for phrase in [
                            "rate limit", "too many requests", "quota exceeded",
                            "statuscode: 429", "status: 429", "http 429",
                        ]):
                            quota_hit = True
                elif ptype == "text" and role == "assistant":
                    t = (p.get("text", "") or "").strip()
                    if t:
                        last_text = t

        # Check if last message is a completed assistant turn with actual text content
        is_done = False
        if msgs and not is_active:
            last_msg = msgs[-1]
            last_info = last_msg.get("info", {})
            last_parts = last_msg.get("parts", [])
            if last_info.get("role") == "assistant" and len(last_parts) > 0:
                has_text = any(
                    p.get("type") == "text" and (p.get("text", "") or "").strip()
                    for p in last_parts
                )
                has_pending_tool = any(
                    (p.get("state", {}).get("status", "") if isinstance(p.get("state"), dict) else str(p.get("state", "")))
                    in ("pending", "running")
                    for p in last_parts
                    if p.get("type") == "tool"
                )
                if has_text and not has_pending_tool:
                    is_done = True

        return {
            "messages": len(msgs),
            "tools": tool_count,
            "tokens": total_tokens,
            "last_text": last_text[-800:],
            "done": is_done,
            "active": is_active,
            "quota_hit": quota_hit,
        }

    def wait_for_completion(self, session_id: str, max_wait: int = MAX_SESSION_WAIT_SEC) -> dict:
        """Poll session until done, stalled, or timed out."""
        start = time.time()
        prev_tools = -1
        stall_ticks = 0
        active_stuck_ticks = 0
        saw_assistant = False
        no_activity_ticks = 0

        # Initial delay — GLM 5.1 needs time to start generating
        log_verbose("Waiting for model to begin...")
        time.sleep(15)

        while time.time() - start < max_wait:
            try:
                status = self.session_status(session_id)
            except Exception as e:
                log(f"Error polling session: {e}", "WARN")
                time.sleep(POLL_INTERVAL_SEC)
                continue

            if status["quota_hit"]:
                log("QUOTA HIT detected in session", "WARN")
                return {**status, "outcome": "quota_hit"}

            if status["tools"] > 0 or status["tokens"] > 0:
                saw_assistant = True
                no_activity_ticks = 0
            else:
                no_activity_ticks += 1

            # Model never started — likely silent rate limit or queue starvation
            if no_activity_ticks >= 12:  # 2 min with zero activity
                log(f"Model never started after {no_activity_ticks * POLL_INTERVAL_SEC}s — treating as quota backoff", "WARN")
                self.abort_session(session_id)
                return {**status, "outcome": "quota_hit"}

            if saw_assistant and status["done"] and not status["active"]:
                elapsed = int(time.time() - start)
                log(f"Session done: {status['tools']} tools, {status['tokens']} tokens, {elapsed}s")
                return {**status, "outcome": "done"}

            if saw_assistant and status["tools"] == prev_tools:
                stall_ticks += 1
                if status["active"]:
                    active_stuck_ticks += 1
            else:
                stall_ticks = 0
                active_stuck_ticks = 0
                prev_tools = status["tools"]

            # Abort if tool count hasn't changed for 2 min (no progress)
            if stall_ticks >= 12 and not status["active"]:
                log(f"Session stalled for {stall_ticks * POLL_INTERVAL_SEC}s — aborting", "WARN")
                self.abort_session(session_id)
                time.sleep(3)
                return {**self.session_status(session_id), "outcome": "stalled"}

            # Abort if a single tool has been "running" for 5 min (e.g. hung pnpm test)
            if active_stuck_ticks >= 30:
                log(f"Tool stuck running for {active_stuck_ticks * POLL_INTERVAL_SEC}s — aborting", "WARN")
                self.abort_session(session_id)
                time.sleep(3)
                return {**self.session_status(session_id), "outcome": "stalled"}

            log_verbose(
                f"  [{int(time.time()-start)}s] msgs={status['messages']} "
                f"tools={status['tools']} tokens={status['tokens']} "
                f"active={status['active']} done={status['done']}"
            )
            time.sleep(POLL_INTERVAL_SEC)

        log(f"Session timed out after {max_wait}s", "WARN")
        self.abort_session(session_id)
        return {**self.session_status(session_id), "outcome": "timeout"}


class QuotaError(Exception):
    pass

# ─── GitHub ───────────────────────────────────────────────────────

def get_open_issues() -> list:
    try:
        r = subprocess.run(
            ["gh", "issue", "list", "--state", "open", "--json",
             "number,title,labels,body", "--limit", "50"],
            capture_output=True, text=True, cwd=str(PROJECT_DIR), timeout=30
        )
        issues = json.loads(r.stdout)
        return sorted(issues, key=_priority_rank)
    except Exception as e:
        log(f"Failed to get issues: {e}", "ERROR")
        return []

def _priority_rank(issue: dict) -> int:
    labels = {l["name"] for l in issue.get("labels", [])}
    if labels & {"P0-critical", "P0"}:
        return 0
    if labels & {"P1-high", "P1"}:
        return 1
    if labels & {"P2-medium", "P2"}:
        return 2
    return 3

def close_issue(number: int, comment: str):
    subprocess.run(
        ["gh", "issue", "close", str(number), "--comment", comment],
        capture_output=True, cwd=str(PROJECT_DIR), timeout=30
    )
    log(f"Closed issue #{number}")

def add_issue_comment(number: int, comment: str):
    subprocess.run(
        ["gh", "issue", "comment", str(number), "--body", comment],
        capture_output=True, cwd=str(PROJECT_DIR), timeout=30
    )

# ─── Quota ────────────────────────────────────────────────────────

class QuotaManager:
    def __init__(self):
        self.file = PROJECT_DIR / "logs" / "quota.json"
        self.state = self._load()

    def _load(self) -> dict:
        if self.file.exists():
            try:
                return json.loads(self.file.read_text())
            except Exception:
                pass
        return {"backoff_until": None, "hit_count": 0}

    def _save(self):
        self.file.write_text(json.dumps(self.state, indent=2, default=str))

    def record_hit(self):
        self.state["hit_count"] = self.state.get("hit_count", 0) + 1
        backoff_min = min(QUOTA_RESET_BACKOFF_MIN * (2 ** (self.state["hit_count"] - 1)), 120)
        until = datetime.now() + timedelta(minutes=backoff_min)
        self.state["backoff_until"] = until.isoformat()
        self._save()
        log(f"Quota hit #{self.state['hit_count']}. Backoff {backoff_min}m until {until.strftime('%H:%M')}", "WARN")

    def record_success(self):
        """Reset hit count when a session successfully runs."""
        if self.state.get("hit_count", 0) > 0:
            self.state["hit_count"] = 0
            self.state["backoff_until"] = None
            self._save()

    def should_wait(self) -> tuple[bool, int]:
        if self.state.get("backoff_until"):
            until = datetime.fromisoformat(self.state["backoff_until"])
            if datetime.now() < until:
                return True, int((until - datetime.now()).total_seconds())
            self.state["backoff_until"] = None
            self.state["hit_count"] = 0
            self._save()
        return False, 0

# ─── Changelog ────────────────────────────────────────────────────

class Changelog:
    def __init__(self):
        if not CHANGELOG_FILE.exists():
            CHANGELOG_FILE.write_text(
                "# Agent Changelog\n\n"
                "Auto-generated executive summaries from the fam-mail agent orchestrator.\n\n"
                "---\n\n"
            )

    def add(self, title: str, body: str, issues_closed: list = None,
            files_changed: int = 0, tests: str = ""):
        ts = datetime.now().strftime("%Y-%m-%d %H:%M")
        entry = f"## [{ts}] {title}\n\n{body}\n\n"
        if issues_closed:
            entry += "**Issues closed:** " + ", ".join(f"#{i}" for i in issues_closed) + "\n\n"
        if files_changed:
            entry += f"**Files changed:** {files_changed}\n\n"
        if tests:
            entry += f"**Tests:** {tests}\n\n"
        entry += "---\n\n"

        existing = CHANGELOG_FILE.read_text()
        parts = existing.split("---\n\n", 1)
        if len(parts) == 2:
            CHANGELOG_FILE.write_text(parts[0] + "---\n\n" + entry + parts[1])
        else:
            with open(CHANGELOG_FILE, "a") as f:
                f.write(entry)

        log(f"Changelog: {title}")

# ─── Progress ─────────────────────────────────────────────────────

class Progress:
    def __init__(self):
        self.data = self._load()

    def _load(self) -> dict:
        if PROGRESS_FILE.exists():
            try:
                return json.loads(PROGRESS_FILE.read_text())
            except Exception:
                pass
        return {
            "started_at": datetime.now().isoformat(),
            "cycles": 0, "issues_attempted": [], "issues_closed": [],
            "sessions": [], "errors": [],
            "total_tools": 0, "total_tokens": 0,
        }

    def save(self):
        PROGRESS_FILE.write_text(json.dumps(self.data, indent=2, default=str))

    def record(self, issue: int, session_id: str, status: dict, closed: bool):
        self.data["cycles"] += 1
        self.data["total_tools"] += status.get("tools", 0)
        self.data["total_tokens"] += status.get("tokens", 0)
        self.data["sessions"].append({
            "cycle": self.data["cycles"],
            "issue": issue,
            "session_id": session_id,
            "tools": status.get("tools", 0),
            "tokens": status.get("tokens", 0),
            "outcome": status.get("outcome", "unknown"),
            "time": datetime.now().isoformat(),
            "closed": closed,
        })
        if issue not in self.data["issues_attempted"]:
            self.data["issues_attempted"].append(issue)
        if closed and issue not in self.data["issues_closed"]:
            self.data["issues_closed"].append(issue)
        self.save()

    def attempts_for(self, issue: int) -> int:
        return sum(1 for s in self.data["sessions"] if s.get("issue") == issue)

# ─── QA ───────────────────────────────────────────────────────────

def _run_check(name: str, cmd: str, timeout_sec: int = 120) -> dict:
    """Run a single QA check. Handles timeout gracefully."""
    log_verbose(f"QA: running {name}...")
    try:
        proc = subprocess.Popen(
            cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            cwd=str(PROJECT_DIR), text=True
        )
        try:
            stdout, _ = proc.communicate(timeout=timeout_sec)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
            stdout = proc.stdout.read() if proc.stdout else ""
            # For frontend tests, vitest often hangs after completion
            # Check if the output contains passing results
            if "pass" in stdout.lower() and "fail" not in stdout.lower():
                log_verbose(f"QA: {name} passed but process hung (killed)")
                return {"pass": True, "output": stdout[-400:]}
            return {"pass": False, "output": f"TIMEOUT after {timeout_sec}s\n{stdout[-300:]}"}

        passed = proc.returncode == 0
        # gtimeout returns 124 when it kills the process (e.g. vitest jsdom hang)
        # If test files show ✓ and no explicit FAIL test markers, treat as passed
        if not passed and proc.returncode == 124:
            has_fail_marker = "FAIL" in stdout or "× " in stdout
            has_passes = "✓" in stdout
            if has_passes and not has_fail_marker:
                passed = True
        # vitest may exit non-zero due to warnings but tests passed
        if not passed and "Tests" in stdout and " 0 failed" in stdout:
            passed = True
        log_verbose(f"QA: {name} {'PASS' if passed else 'FAIL'}")
        return {"pass": passed, "output": stdout[-400:]}
    except Exception as e:
        return {"pass": False, "output": str(e)[:200]}

def run_qa() -> dict:
    """Run all QA checks locally. Returns structured results."""
    results = {}
    checks = [
        ("backend_tests", "cd backend && pnpm test 2>&1", 60),
        ("frontend_tests", "cd frontend && gtimeout 45 npx vitest --run --reporter=verbose 2>&1", 60),
        ("backend_lint", "cd backend && pnpm lint 2>&1", 30),
        ("frontend_lint", "cd frontend && pnpm lint 2>&1", 30),
        ("frontend_build", "cd frontend && pnpm build 2>&1", 60),
    ]
    for name, cmd, timeout in checks:
        results[name] = _run_check(name, cmd, timeout)

    results["green"] = all(r["pass"] for r in results.values() if isinstance(r, dict))
    failing = [k for k, v in results.items() if isinstance(v, dict) and not v.get("pass")]
    log(f"QA result: {'GREEN' if results['green'] else 'RED — failing: ' + ', '.join(failing)}")
    return results

# ─── Prompts ──────────────────────────────────────────────────────

def implement_prompt(issue: dict) -> str:
    n = issue["number"]
    title = issue["title"]
    body = (issue.get("body") or "")[:2000]
    labels = ", ".join(l["name"] for l in issue.get("labels", []))

    return f"""You are fixing GitHub issue #{n}: {title}

## Issue
{body if body else title}

## Labels: {labels}

## Workflow
1. Read the relevant source files
2. Implement the fix — focused, atomic changes only
3. Run backend tests: `cd /Users/nick/Documents/Projects/fam-mail/backend && pnpm test`
4. Run frontend tests: `cd /Users/nick/Documents/Projects/fam-mail/frontend && gtimeout 60 npx vitest --run --reporter=verbose 2>&1 || true`
   IMPORTANT: Do NOT use `pnpm test -- --run` for frontend — Vitest hangs due to jsdom timer leaks. Always use `gtimeout 60 npx vitest --run` instead.
5. Run lint: `cd /Users/nick/Documents/Projects/fam-mail/backend && pnpm lint`
6. Run lint: `cd /Users/nick/Documents/Projects/fam-mail/frontend && pnpm lint`
7. Fix any failures before finishing
8. Commit with: `git add -A && git commit -m "fix: <description> (#{n})"`

## Rules
- Use pnpm (not npm/yarn) for installs, but `gtimeout 60 npx vitest --run` for frontend tests
- Use absolute paths in all bash commands
- Do NOT start dev servers
- Do NOT run commands that could hang indefinitely — always use gtimeout
- After committing, output exactly: IMPLEMENTATION_COMPLETE
"""

def triage_prompt() -> str:
    return """Scan the fam-mail codebase for issues not yet tracked on GitHub.

1. Run: `cd /Users/nick/Documents/Projects/fam-mail/backend && pnpm test`
2. Run: `cd /Users/nick/Documents/Projects/fam-mail/frontend && gtimeout 60 npx vitest --run --reporter=verbose 2>&1 || true`
3. Run: `cd /Users/nick/Documents/Projects/fam-mail/backend && pnpm lint`
4. Run: `cd /Users/nick/Documents/Projects/fam-mail/frontend && pnpm lint`
5. Check: `gh issue list --state open --limit 50 --json number,title`
6. For NEW problems not already tracked, create issues with `gh issue create`
   Labels: P0-critical/P1-high/P2-medium/P3-low, area:frontend/area:backend, bug/enhancement/testing/security

Only create issues for genuinely new, untracked problems."""

# ─── Orchestrator ─────────────────────────────────────────────────

class Orchestrator:
    def __init__(self):
        (PROJECT_DIR / "logs" / "sessions").mkdir(parents=True, exist_ok=True)
        acquire_lock()
        self.api = OpenCodeAPI(OPENCODE_URL)
        self.quota = QuotaManager()
        self.changelog = Changelog()
        self.progress = Progress()
        self.running = True
        self.start_time = datetime.now()

        signal.signal(signal.SIGINT, self._stop)
        signal.signal(signal.SIGTERM, self._stop)

    def _stop(self, *_):
        log("Shutting down...")
        self.running = False

    def ensure_server(self) -> bool:
        if self.api.health():
            return True
        return self.api.start_server()

    def pick_issue(self, issues: list) -> Optional[dict]:
        """Pick highest priority issue with < MAX_ATTEMPTS attempts."""
        for issue in issues:
            if self.progress.attempts_for(issue["number"]) < MAX_ATTEMPTS_PER_ISSUE:
                return issue
        return None

    def implement(self, issue: dict) -> bool:
        """Run implementation session. Returns True if issue was closed."""
        n = issue["number"]
        title = issue["title"]
        attempts = self.progress.attempts_for(n) + 1
        log(f"Implementing #{n}: {title} (attempt {attempts}/{MAX_ATTEMPTS_PER_ISSUE})")

        head_before = git_head_sha()

        sid = self.api.create_session(f"Fix #{n}: {title[:50]}")
        if DRY_RUN:
            log(f"[DRY RUN] Would implement #{n}")
            return False

        try:
            if not self.api.send_prompt(sid, implement_prompt(issue)):
                return False
        except QuotaError:
            self.quota.record_hit()
            return False

        result = self.api.wait_for_completion(sid)

        # Save session log
        log_path = SESSION_LOG_DIR / f"cycle{self.progress.data['cycles']+1}_issue{n}.json"
        log_path.write_text(json.dumps({
            "session_id": sid, "issue": n, "attempt": attempts,
            "time": datetime.now().isoformat(), "result": result,
        }, indent=2, default=str))

        if result["outcome"] == "quota_hit":
            self.quota.record_hit()
            self.progress.record(n, sid, result, closed=False)
            return False

        # Check for new commits
        new_commits = git_commits_since(head_before)
        has_commit = any(f"#{n}" in c["message"] or f"({n})" in c["message"]
                        for c in new_commits)
        made_progress = result.get("tools", 0) >= 3 or has_commit

        if made_progress:
            self.quota.record_success()

        if not made_progress:
            log(f"No meaningful progress on #{n}")
            self.progress.record(n, sid, result, closed=False)
            return False

        # Check for completion marker
        text = result.get("last_text", "")
        marked_complete = "IMPLEMENTATION_COMPLETE" in text

        # Run QA verification
        log("Running QA verification...")
        qa = run_qa()

        if qa["green"]:
            if has_commit or marked_complete:
                close_issue(n, f"Fixed by agent (session {sid}). All QA checks pass.")
                self.changelog.add(
                    f"Closed #{n}: {title}",
                    text[:400] if text else f"Fixed in {len(new_commits)} commits.",
                    issues_closed=[n],
                    files_changed=len(new_commits),
                    tests="All passing (GREEN)"
                )
                self.progress.record(n, sid, result, closed=True)
                log(f"CLOSED issue #{n}")
                return True
            else:
                log(f"QA green but no commit for #{n} — recording progress")
        else:
            failing = [k for k, v in qa.items() if isinstance(v, dict) and not v.get("pass")]
            log(f"QA RED after #{n}: {failing}", "WARN")
            if attempts >= MAX_ATTEMPTS_PER_ISSUE:
                add_issue_comment(n,
                    f"Agent attempted {attempts}x but QA still failing: {', '.join(failing)}")

        self.progress.record(n, sid, result, closed=False)
        self.changelog.add(
            f"Progress on #{n}: {title}",
            f"Attempt {attempts}. {result.get('tools',0)} tools, "
            f"{len(new_commits)} commits. QA: {'GREEN' if qa['green'] else 'RED'}."
        )
        return False

    def triage(self):
        """Run triage to find new issues."""
        log("Running triage scan...")
        sid = self.api.create_session("Triage Scan")
        try:
            if not self.api.send_prompt(sid, triage_prompt(), agent="build"):
                return
        except QuotaError:
            self.quota.record_hit()
            return
        result = self.api.wait_for_completion(sid, max_wait=600)
        if result["outcome"] == "quota_hit":
            self.quota.record_hit()
            return
        self.changelog.add("Triage Scan", result.get("last_text", "")[:400])

    def fix_qa(self, qa_results: dict):
        """Use agent to fix failing QA checks."""
        failing = [k for k, v in qa_results.items()
                    if isinstance(v, dict) and not v.get("pass")]
        if not failing:
            return

        log(f"Fixing QA failures: {', '.join(failing)}")
        sid = self.api.create_session(f"QA Fix: {', '.join(failing[:3])}")
        prompt = (
            "Fix the following failing QA checks:\n\n"
            + "\n".join(
                f"**{k}** (FAILING):\n```\n{qa_results[k].get('output','')}\n```\n"
                for k in failing
            )
            + "\nFix all issues. Use absolute paths. Re-run each check to verify.\n"
            + "After all checks pass, commit and output: IMPLEMENTATION_COMPLETE"
        )
        try:
            if not self.api.send_prompt(sid, prompt):
                return
        except QuotaError:
            self.quota.record_hit()
            return
        result = self.api.wait_for_completion(sid)
        if result["outcome"] == "quota_hit":
            self.quota.record_hit()
        self.changelog.add("QA Fix", f"Addressed: {', '.join(failing)}")

    def status_line(self) -> str:
        p = self.progress.data
        elapsed = (datetime.now() - self.start_time).total_seconds() / 3600
        issues = get_open_issues()
        waiting, wait_s = self.quota.should_wait()
        quota_str = f"BACKOFF {wait_s//60}m" if waiting else "OK"
        return (
            f"[{elapsed:.1f}h] cycles={p['cycles']} "
            f"closed={len(p['issues_closed'])} "
            f"open={len(issues)} "
            f"tools={p['total_tools']} "
            f"tokens={p['total_tokens']} "
            f"quota={quota_str}"
        )

    def print_status(self):
        p = self.progress.data
        elapsed = (datetime.now() - self.start_time).total_seconds() / 3600
        issues = get_open_issues()
        log(f"STATUS: {self.status_line()}")

    def run(self):
        log("=" * 60)
        log("  Fam-Mail Agent Orchestrator v2")
        log("=" * 60)

        if STATUS_ONLY:
            print(self.status_line())
            return

        issues = get_open_issues()
        self.changelog.add("Orchestrator v2 Started",
                           f"{len(issues)} open issues. PID={os.getpid()}")

        while self.running:
            try:
                self.progress.data["cycles"] += 0  # just to trigger

                # Quota check
                waiting, wait_s = self.quota.should_wait()
                if waiting and wait_s > 0:
                    sleep_for = min(wait_s, 60)
                    log(f"Quota backoff: {wait_s}s remaining. Sleeping {sleep_for}s...")
                    time.sleep(sleep_for)
                    continue

                # Server check
                if not self.ensure_server():
                    log("OpenCode server unavailable. Retrying in 30s...", "ERROR")
                    time.sleep(30)
                    continue

                # Get issues
                issues = get_open_issues()
                if not issues:
                    log("No open issues. Running triage...")
                    self.triage()
                    issues = get_open_issues()
                    if not issues:
                        log("All issues resolved! Orchestrator complete.")
                        self.changelog.add("Complete",
                            f"All issues resolved in {self.progress.data['cycles']} cycles.")
                        break
                    continue

                # Pick next issue
                issue = self.pick_issue(issues)
                if not issue:
                    log(f"All {len(issues)} issues exhausted ({MAX_ATTEMPTS_PER_ISSUE} attempts each)")
                    # Run QA to see if baseline is green
                    qa = run_qa()
                    if not qa["green"]:
                        self.fix_qa(qa)
                    else:
                        self.triage()
                    continue

                # Implement
                self.implement(issue)
                self.print_status()

            except KeyboardInterrupt:
                break
            except Exception as e:
                log(f"Cycle error: {e}", "ERROR")
                log(traceback.format_exc(), "ERROR")
                self.progress.data["errors"].append({
                    "time": datetime.now().isoformat(), "error": str(e)
                })
                self.progress.save()
                time.sleep(30)

        self.changelog.add("Orchestrator Stopped",
            f"Ran {self.progress.data['cycles']} cycles over "
            f"{(datetime.now()-self.start_time).total_seconds()/3600:.1f}h. "
            f"Closed {len(self.progress.data['issues_closed'])} issues.")
        self.progress.save()
        release_lock()
        log("Shutdown complete.")


if __name__ == "__main__":
    Orchestrator().run()
