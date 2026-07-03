// convex/convex.config.ts
//
// Register the MCP gateway component. Forgetting `app.use(mcpGateway)` means
// `components.mcpGateway` does not exist and the gateway constructor throws.
import { defineApp } from 'convex/server'
import mcpGateway from 'convex-mcp-gateway/convex.config'
// import agent from '@convex-dev/agent/convex.config' // if you also run an in-app agent

const app = defineApp()
// app.use(agent)
app.use(mcpGateway) // ← creates components.mcpGateway (registry / audit / sessions tables)

export default app
