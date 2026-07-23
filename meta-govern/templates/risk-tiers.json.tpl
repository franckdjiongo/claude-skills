{
  "_doc": "Path-risk tiers consumed by sample-review.mjs (weighted human-review sampling) and by write-plan/execute-plan (deterministic tier floor). tierOf(path) is a PURE function — first matching precedence critique -> bas -> standard wins, default standard — covered by sample-review's tests. Globs are stack-neutral: adapt them to this project's layout. `**` spans path separators, `*` stops at one.",
  "critique": [
    "src/**/repositories/**",
    "**/calculs-paie/**",
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
  ]
}
