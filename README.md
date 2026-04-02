# Codex Lens

`codex-lens` is a local analytics dashboard for Codex usage.

It reads directly from `~/.codex/` and visualizes:

- sessions and threads
- tool and MCP usage
- workspace activity
- prompt history
- local skills, prompts, and plugin inventory

## Credit

This project is directly inspired by [`cc-lens`](https://github.com/Arindam200/cc-lens), created by Arindam Majumder.

`codex-lens` started as a Codex-focused adaptation of that idea and reuses the overall dashboard/app-shell approach while replacing the Claude-specific data layer with a Codex-native one.

Credit to:

- Arindam Majumder for the original [`cc-lens`](https://github.com/Arindam200/cc-lens) concept, structure, and implementation foundation
- Senthil Ramesh for driving the Codex adaptation, direction, and product intent for this version

## Run locally

```bash
npm install
npm run dev
```

Or launch through the packaged CLI:

```bash
npx codex-lens
```

## Data sources

- `~/.codex/sessions/**/*.jsonl`
- `~/.codex/session_index.jsonl`
- `~/.codex/history.jsonl`
- `~/.codex/config.toml`
- `~/.codex/skills/`
- `~/.codex/prompts/`
- `~/.codex/plugins/`
- `~/.codex/memories/`

## Notes

- This version is JSONL-first and file-based.
- SQLite-backed deep analytics are intentionally deferred.
- Cost metrics are currently conservative placeholders rather than inferred pricing.
