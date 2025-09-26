import { MCPTool, Neo4jConfig } from './types.js'
import { Neo4jSchemaTool, Neo4jQueryTool } from './neo4j-tools.js'

// Neo4j MCP Server implementation following the webpage generator pattern
class Neo4jMCPServer {
  private tools: MCPTool[] = []
  private config: Neo4jConfig
  private readOnly: boolean

  constructor(config: Neo4jConfig, options?: { readOnly?: boolean }) {
    this.config = config
    this.readOnly = options?.readOnly || false
    this.initializeTools()
  }

  private initializeTools(): void {
    // Initialize Neo4j tools
    const schemaTool = new Neo4jSchemaTool(this.config)
    const queryTool = new Neo4jQueryTool(this.config, this.readOnly)

    this.tools = [schemaTool, queryTool]
  }

  getTools(): MCPTool[] {
    return this.tools
  }

  async executeTool(toolName: string, data: any): Promise<any> {
    const tool = this.tools.find(t => t.name === toolName)
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`)
    }

    try {
      return await tool.handler(data)
    } catch (error) {
      console.error(`Error executing tool '${toolName}':`, error)
      throw error
    }
  }

  async close(): Promise<void> {
    // Close all tools that have a close method
    for (const tool of this.tools) {
      if ('close' in tool && typeof tool.close === 'function') {
        await (tool as any).close()
      }
    }
  }
}

// Factory function following the webpage generator pattern
export const GetTools = (config: Neo4jConfig, options?: { readOnly?: boolean }): MCPTool[] => {
  const server = new Neo4jMCPServer(config, options)
  return server.getTools()
}

// Default export for compatibility
const createNeo4jTools = (config: Neo4jConfig, options?: { readOnly?: boolean }): MCPTool[] => {
  return GetTools(config, options)
}

export default createNeo4jTools
export { Neo4jMCPServer, Neo4jSchemaTool, Neo4jQueryTool }
export * from './types.js'