import { GetTools, Neo4jMCPServer } from '../src/index.js'
import { Neo4jConfig } from '../src/types.js'

describe('Integration Tests', () => {
  const mockConfig: Neo4jConfig = {
    uri: 'bolt://localhost:7687',
    username: 'neo4j',
    password: 'password',
    database: 'neo4j'
  }

  describe('GetTools Factory Function', () => {
    test('should return an array of MCP tools', () => {
      const tools = GetTools(mockConfig)
      
      expect(Array.isArray(tools)).toBe(true)
      expect(tools.length).toBe(2)
      
      const toolNames = tools.map(tool => tool.name)
      expect(toolNames).toContain('get_neo4j_schema')
      expect(toolNames).toContain('run_cypher_query')
    })

    test('should return tools with proper MCP interface', () => {
      const tools = GetTools(mockConfig)
      
      tools.forEach(tool => {
        expect(typeof tool.name).toBe('string')
        expect(typeof tool.description).toBe('string')
        expect(tool.args).toBeDefined()
        expect(typeof tool.handler).toBe('function')
      })
    })

    test('should handle read-only option', () => {
      const readOnlyTools = GetTools(mockConfig, { readOnly: true })
      const regularTools = GetTools(mockConfig, { readOnly: false })
      
      expect(readOnlyTools.length).toBe(regularTools.length)
      // Tools should be the same, but behavior differs in the handler
    })
  })

  describe('Neo4jMCPServer Class', () => {
    let server: Neo4jMCPServer

    afterEach(async () => {
      if (server) {
        await server.close()
      }
    })

    test('should instantiate successfully', () => {
      server = new Neo4jMCPServer(mockConfig)
      expect(server).toBeInstanceOf(Neo4jMCPServer)
    })

    test('should return correct tools', () => {
      server = new Neo4jMCPServer(mockConfig)
      const tools = server.getTools()
      
      expect(tools.length).toBe(2)
      expect(tools.map(t => t.name)).toEqual(['get_neo4j_schema', 'run_cypher_query'])
    })

    test('should handle invalid tool name', async () => {
      server = new Neo4jMCPServer(mockConfig)
      
      await expect(server.executeTool('invalid_tool', {}))
        .rejects
        .toThrow("Tool 'invalid_tool' not found")
    })

    test('should properly close connections', async () => {
      server = new Neo4jMCPServer(mockConfig)
      
      // This should not throw
      await expect(server.close()).resolves.not.toThrow()
    })
  })

  describe('Tool Parameter Validation', () => {
    test('schema tool should accept empty parameters', () => {
      const tools = GetTools(mockConfig)
      const schemaTool = tools.find(t => t.name === 'get_neo4j_schema')
      
      expect(schemaTool).toBeDefined()
      const result = schemaTool!.args.safeParse({})
      expect(result.success).toBe(true)
    })

    test('query tool should validate parameters correctly', () => {
      const tools = GetTools(mockConfig)
      const queryTool = tools.find(t => t.name === 'run_cypher_query')
      
      expect(queryTool).toBeDefined()
      
      // Valid parameters
      const validResult = queryTool!.args.safeParse({
        cypher: 'MATCH (n) RETURN n',
        parameters: { limit: 10 }
      })
      expect(validResult.success).toBe(true)
      
      // Missing cypher parameter
      const invalidResult = queryTool!.args.safeParse({
        parameters: { limit: 10 }
      })
      expect(invalidResult.success).toBe(false)
    })
  })
})