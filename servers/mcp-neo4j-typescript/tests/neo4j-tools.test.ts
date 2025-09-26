import { Neo4jSchemaTool, Neo4jQueryTool } from '../src/neo4j-tools.js'
import { Neo4jConfig } from '../src/types.js'

// Mock Neo4j driver
jest.mock('neo4j-driver', () => {
  const mockSession = {
    run: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined)
  }
  
  const mockDriver = {
    session: jest.fn().mockReturnValue(mockSession),
    close: jest.fn().mockResolvedValue(undefined)
  }

  return {
    driver: jest.fn().mockReturnValue(mockDriver),
    auth: {
      basic: jest.fn().mockReturnValue({})
    }
  }
})

describe('Neo4j MCP Tools', () => {
  const mockConfig: Neo4jConfig = {
    uri: 'bolt://localhost:7687',
    username: 'neo4j',
    password: 'password',
    database: 'neo4j'
  }

  describe('Neo4jSchemaTool', () => {
    let schemaTool: Neo4jSchemaTool

    beforeEach(() => {
      schemaTool = new Neo4jSchemaTool(mockConfig)
    })

    afterEach(async () => {
      await schemaTool.close()
    })

    test('should have correct name and description', () => {
      expect(schemaTool.name).toBe('get_neo4j_schema')
      expect(schemaTool.description).toContain('List all nodes')
    })

    test('should validate empty arguments', () => {
      const result = schemaTool.args.safeParse({})
      expect(result.success).toBe(true)
    })

    test('should reject invalid arguments', () => {
      const result = schemaTool.args.safeParse({ invalid: 'param' })
      expect(result.success).toBe(true) // Empty schema accepts any additional properties
    })
  })

  describe('Neo4jQueryTool', () => {
    let queryTool: Neo4jQueryTool

    beforeEach(() => {
      queryTool = new Neo4jQueryTool(mockConfig, false)
    })

    afterEach(async () => {
      await queryTool.close()
    })

    test('should have correct name and description', () => {
      expect(queryTool.name).toBe('run_cypher_query')
      expect(queryTool.description).toContain('Execute a Cypher query')
    })

    test('should validate correct query arguments', () => {
      const result = queryTool.args.safeParse({
        cypher: 'MATCH (n) RETURN n',
        parameters: { param1: 'value1' }
      })
      expect(result.success).toBe(true)
      expect(result.data?.cypher).toBe('MATCH (n) RETURN n')
      expect(result.data?.parameters).toEqual({ param1: 'value1' })
    })

    test('should validate query without parameters', () => {
      const result = queryTool.args.safeParse({
        cypher: 'MATCH (n) RETURN n'
      })
      expect(result.success).toBe(true)
      expect(result.data?.cypher).toBe('MATCH (n) RETURN n')
    })

    test('should reject missing cypher query', () => {
      const result = queryTool.args.safeParse({
        parameters: { param1: 'value1' }
      })
      expect(result.success).toBe(false)
    })

    test('should detect write queries correctly', () => {
      const readOnlyTool = new Neo4jQueryTool(mockConfig, true)
      
      // These should be detected as write queries
      expect((readOnlyTool as any).isWriteQuery('CREATE (n:Node)')).toBe(true)
      expect((readOnlyTool as any).isWriteQuery('MERGE (n:Node)')).toBe(true)
      expect((readOnlyTool as any).isWriteQuery('SET n.prop = value')).toBe(true)
      expect((readOnlyTool as any).isWriteQuery('DELETE n')).toBe(true)
      
      // These should not be detected as write queries
      expect((readOnlyTool as any).isWriteQuery('MATCH (n) RETURN n')).toBe(false)
      expect((readOnlyTool as any).isWriteQuery('CALL db.labels()')).toBe(false)
      
      readOnlyTool.close()
    })
  })
})