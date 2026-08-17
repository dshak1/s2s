<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## MCP React/shadcn Capability

**Active 2026-08-01:** Cursor MCP server initialized for React components.

```bash
npx shadcn@4.15.0 mcp init --client cursor
```

Claude agents can now:
- Read/write React components directly via MCP protocol
- Access shadcn component library machine-readable interface
- Iterate frontend without manual component tweaking

Use for: S2S frontend iteration, state, styling, composition.
