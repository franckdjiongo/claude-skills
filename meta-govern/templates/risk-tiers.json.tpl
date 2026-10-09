{
  "_doc": "Path-risk tiers consumed by sample-review.mjs (weighted human-review sampling) and by write-plan/execute-plan (deterministic tier floor). tierOf(path) is a PURE function — first matching precedence critique -> bas -> standard wins, default standard — covered by sample-review's tests. The critique defaults mirror sample-review's DEFAULT_TIERS: replace them with THIS project's critical paths (payroll, billing, auth…). `**` spans path separators, `*` stops at one. bashWriteGuard.watchedRoots: directory prefixes (not globs) whose shell writes bash-write-guard shadow-logs, denied under BASH_WRITE_GUARD_ENFORCE=1; absent key = [\"src\"], [] = none.",
  "critique": [
    "**/repositories/**",
    "src/domain/**",
    "**/security/**",
    ".claude/hooks/**"
  ],
  "standard": [
    "src/**"
  ],
  "bas": [
    "**/assets/**",
    "**/*.css"
  ],
  "bashWriteGuard": {
    "watchedRoots": ["src"]
  }
}
