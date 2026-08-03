<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

Breaking changes here. APIs, conventions, file structure may differ from training data. Read guide in `node_modules/next/dist/docs/` before code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## MCP React/shadcn Capability

**Active 2026-08-01:** Cursor MCP server init for React components.

```bash
npx shadcn@4.15.0 mcp init --client cursor
```

Claude agents can now:
- Read/write React components direct via MCP protocol
- Access shadcn component library machine-readable interface
- Iterate frontend, no manual component tweaking

Use for: S2S frontend iteration, state, styling, composition.