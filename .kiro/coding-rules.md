# Coding Rules

## Shell Commands

- **NEVER run `node -e "..."` or `python -c "..."` with inline code bodies.** This breaks the console.
- Always create a temporary file (e.g., `/tmp/test.ts`, `/tmp/verify.js`) and execute that file instead.
- Clean up temp files after use.
