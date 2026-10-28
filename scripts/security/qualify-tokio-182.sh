#!/usr/bin/env bash
# Issue #182. Run from a clean dedicated branch at the Viable repository root.
# This helper never commits, pushes, publishes, or starts GitHub Actions.
set -Eeuo pipefail
fail() { printf 'STOP: %s\n' "$*" >&2; exit 1; }
for cmd in git python3 rustc cargo npm; do command -v "$cmd" >/dev/null || fail "$cmd required"; done
root="$(git rev-parse --show-toplevel)" || fail "Not in a Git checkout"
[[ "$(cd "$root" && pwd -P)" == "$(pwd -P)" ]] || fail "Run from the repository root"
branch="$(git symbolic-ref --quiet --short HEAD)" || fail "Detached HEAD is not authorized"
[[ "$branch" != main && "$branch" != master ]] || fail "Use a dedicated branch"
[[ -z "$(git status --porcelain=v1 --untracked-files=normal)" ]] || fail "Working tree must be clean"
[[ "$(rustc --version)" == rustc\ 1.88.* ]] || fail "Rust 1.88 required"
manifest=apps/desktop/src-tauri/Cargo.toml
lock=apps/desktop/src-tauri/Cargo.lock
[[ -f "$manifest" && -f "$lock" ]] || fail "Missing native manifest or lockfile"
python3 - "$lock" 1.53.1 <<'PY'
import sys, tomllib
with open(sys.argv[1], "rb") as f: packages = tomllib.load(f)["package"]
actual = [p["version"] for p in packages if p["name"] == "tokio"]
if actual != [sys.argv[2]]:
    raise SystemExit(f"STOP: unreviewed Tokio baseline {actual}; reassess before updating")
PY
cargo update --manifest-path "$manifest" -p tokio --precise 1.53.3
python3 - "$lock" 1.53.3 <<'PY'
import sys, tomllib
with open(sys.argv[1], "rb") as f: packages = tomllib.load(f)["package"]
actual = [p["version"] for p in packages if p["name"] == "tokio"]
if actual != [sys.argv[2]]:
    raise SystemExit(f"STOP: unexpected resolved Tokio versions {actual}")
PY
[[ "$(git status --porcelain=v1 --untracked-files=all)" == " M $lock" ]] || fail "Unexpected working-tree changes"
[[ "$(git diff --name-only)" == "$lock" ]] || fail "Changes outside lockfile"
git diff --check || fail "Invalid diff"
git diff -- "$lock"
cargo tree --manifest-path "$manifest" --locked -i tokio
cargo tree --manifest-path "$manifest" --locked -i glib || true
cargo fmt --manifest-path "$manifest" --check
cargo test --manifest-path "$manifest" --locked
command -v cargo-audit >/dev/null || fail "cargo-audit required"
cargo audit --file "$lock" || fail "RustSec audit failed"
npm ci
npm run desktop:bundle
printf 'LOCAL QUALIFICATION COMPLETE. Separately review audit warnings, provider I/O, Debian, platform reachability, and PR evidence. No commit/push performed.\n'
