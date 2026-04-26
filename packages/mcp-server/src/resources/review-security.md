# Security Review Checklist

Use this resource when reviewing code changes for security issues.

## Authentication & Authorization
- [ ] No hardcoded credentials, API keys, or secrets in code
- [ ] All endpoints require appropriate authentication
- [ ] Authorization checks are performed server-side, not just client-side
- [ ] Principle of least privilege applied to permissions

## Input Validation
- [ ] All user inputs are validated and sanitized
- [ ] Path traversal attacks mitigated (e.g. no unchecked `../` in paths)
- [ ] Command injection mitigated (no `exec`/`spawn` with raw user input)
- [ ] SQL injection mitigated (parameterized queries used)

## Data Handling
- [ ] Sensitive data (passwords, tokens) never logged
- [ ] PII is minimized and protected
- [ ] Secrets loaded from environment variables or secret manager, not config files
- [ ] `.gitignore` excludes credential files and `.env`

## Dependencies
- [ ] No known vulnerable packages (`npm audit` clean)
- [ ] Dependencies are pinned or ranged conservatively
- [ ] No new packages added without explicit approval

## Error Handling
- [ ] Errors never leak internal stack traces or paths to end users
- [ ] Error messages are generic for security-sensitive failures (auth, not-found)

## File System
- [ ] File paths are validated before use
- [ ] Write operations are restricted to expected directories
- [ ] Temporary files are cleaned up and not world-readable

## Instructions for the Agent
1. Read the diff or changed files.
2. Work through each checklist section above.
3. Flag any failing checks with: file, line, issue, and recommended fix.
4. If no issues found, respond: "Security review complete — no issues found."
