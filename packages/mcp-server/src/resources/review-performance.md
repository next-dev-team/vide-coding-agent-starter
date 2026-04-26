# Performance Review Checklist

Use this resource when reviewing code changes for performance issues.

## Algorithmic Complexity
- [ ] No O(n²) or worse loops where O(n log n) or better is achievable
- [ ] Early exits used where possible (short-circuit evaluation)
- [ ] Recursion has proper base cases and won't cause stack overflow on large inputs

## I/O & Async
- [ ] File reads/writes are async where feasible (avoid blocking `readFileSync` in hot paths)
- [ ] Database queries avoid N+1 patterns (batch queries instead of per-item queries)
- [ ] Unnecessary `await` in serial not replaced by parallel `Promise.all` where safe

## Memory
- [ ] Large arrays/objects are not retained in memory longer than needed
- [ ] Streams used for large file processing instead of loading entire file into memory
- [ ] Caches have eviction policies (bounded size, TTL) — no unbounded growth

## Caching
- [ ] Expensive computations cached when inputs are stable
- [ ] Cache keys are stable and deterministic
- [ ] Cache invalidation is correct (no stale reads)

## Database
- [ ] Indexes exist for all filter/sort columns
- [ ] FTS queries use prepared statements, not concatenated strings
- [ ] Transactions batched for multi-row writes

## VS Code Extension Specific
- [ ] WebView HTML is not regenerated on every key press
- [ ] `postMessage` is debounced for high-frequency events
- [ ] File watchers use `glob` patterns, not watching entire workspace

## Instructions for the Agent
1. Read the diff or changed files.
2. Work through each checklist section above.
3. Flag any failing checks with: file, line, issue, estimated impact (low/medium/high), and recommended fix.
4. If no issues found, respond: "Performance review complete — no issues found."
