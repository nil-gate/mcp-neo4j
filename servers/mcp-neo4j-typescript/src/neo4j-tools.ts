import { z } from 'zod'
import neo4j, { Driver, Session } from 'neo4j-driver'
import { MCPTool, Neo4jConfig, ToolResult, QueryResult, Neo4jSchemaResult } from './types.js'

// Neo4j Schema Tool
class Neo4jSchemaTool implements MCPTool {
  name = 'get_neo4j_schema'
  description = 'List all nodes, their attributes and their relationships to other nodes in the neo4j database. This requires that the APOC plugin is installed and enabled.'
  args = z.object({})

  private driver: Driver
  private database: string

  constructor(config: Neo4jConfig) {
    this.driver = neo4j.driver(config.uri, neo4j.auth.basic(config.username, config.password))
    this.database = config.database || 'neo4j'
  }

  async handler(data: any): Promise<ToolResult> {
    const parsed = this.args.safeParse(data)
    if (!parsed.success) {
      throw new Error(`Schema tool parameters invalid: ${parsed.error}`)
    }

    const session = this.driver.session({ database: this.database })
    
    try {
      const query = 'CALL apoc.meta.schema();'
      const result = await session.run(query)
      
      const schemaData: Neo4jSchemaResult = {}
      
      for (const record of result.records) {
        const value = record.get(0)
        if (value) {
          // Clean the schema data similar to Python implementation
          const cleanedSchema = this.cleanSchema(value)
          Object.assign(schemaData, cleanedSchema)
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(schemaData, null, 2)
          }
        ],
        structured_content: { schema: schemaData }
      }
    } catch (error) {
      console.error('Error getting Neo4j schema:', error)
      throw new Error(`Failed to get Neo4j schema: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      await session.close()
    }
  }

  private cleanSchema(schema: any): Neo4jSchemaResult {
    const cleaned: Neo4jSchemaResult = {}

    for (const [key, entry] of Object.entries(schema)) {
      const entryData = entry as any
      const newEntry: any = { type: entryData.type }
      
      if ('count' in entryData) {
        newEntry.count = entryData.count
      }

      const labels = entryData.labels
      if (labels && Array.isArray(labels)) {
        newEntry.labels = labels
      }

      const props = entryData.properties
      if (props && typeof props === 'object') {
        const cleanProps: any = {}
        for (const [pname, pinfo] of Object.entries(props)) {
          const pinfoData = pinfo as any
          const cp: any = {}
          if ('indexed' in pinfoData) {
            cp.indexed = pinfoData.indexed
          }
          if ('type' in pinfoData) {
            cp.type = pinfoData.type
          }
          if (Object.keys(cp).length > 0) {
            cleanProps[pname] = cp
          }
        }
        if (Object.keys(cleanProps).length > 0) {
          newEntry.properties = cleanProps
        }
      }

      if (entryData.relationships) {
        const relsOut: any = {}
        for (const [relName, rel] of Object.entries(entryData.relationships)) {
          const relData = rel as any
          const cr: any = {}
          if ('direction' in relData) {
            cr.direction = relData.direction
          }
          
          const rlabels = relData.labels
          if (rlabels && Array.isArray(rlabels)) {
            cr.labels = rlabels
          }

          const rprops = relData.properties
          if (rprops && typeof rprops === 'object') {
            const cleanRprops: any = {}
            for (const [rpname, rpinfo] of Object.entries(rprops)) {
              const rpinfoData = rpinfo as any
              const crp: any = {}
              if ('indexed' in rpinfoData) {
                crp.indexed = rpinfoData.indexed
              }
              if ('type' in rpinfoData) {
                crp.type = rpinfoData.type
              }
              if (Object.keys(crp).length > 0) {
                cleanRprops[rpname] = crp
              }
            }
            if (Object.keys(cleanRprops).length > 0) {
              cr.properties = cleanRprops
            }
          }

          if (Object.keys(cr).length > 0) {
            relsOut[relName] = cr
          }
        }
        if (Object.keys(relsOut).length > 0) {
          newEntry.relationships = relsOut
        }
      }

      cleaned[key] = newEntry
    }

    return cleaned
  }

  async close(): Promise<void> {
    await this.driver.close()
  }
}

// Neo4j Query Execution Tool
class Neo4jQueryTool implements MCPTool {
  name = 'run_cypher_query'
  description = 'Execute a Cypher query on the Neo4j database. Supports both read and write operations.'
  args = z.object({
    cypher: z.string().describe('The Cypher query to execute'),
    parameters: z.record(z.any()).optional().describe('Parameters for the Cypher query')
  })

  private driver: Driver
  private database: string
  private readOnly: boolean

  constructor(config: Neo4jConfig, readOnly: boolean = false) {
    this.driver = neo4j.driver(config.uri, neo4j.auth.basic(config.username, config.password))
    this.database = config.database || 'neo4j'
    this.readOnly = readOnly
  }

  async handler(data: any): Promise<ToolResult> {
    const parsed = this.args.safeParse(data)
    if (!parsed.success) {
      throw new Error(`Query tool parameters invalid: ${parsed.error}`)
    }

    const { cypher, parameters = {} } = parsed.data

    // Check if query is a write operation when in read-only mode
    if (this.readOnly && this.isWriteQuery(cypher)) {
      throw new Error('Write queries are not allowed in read-only mode')
    }

    const session = this.driver.session({ database: this.database })
    
    try {
      const startTime = Date.now()
      const result = await session.run(cypher, parameters)
      const endTime = Date.now()

      const records = result.records.map(record => {
        const obj: any = {}
        record.keys.forEach(key => {
          obj[key] = this.serializeNeo4jValue(record.get(key))
        })
        return obj
      })

      const queryResult: QueryResult = {
        records,
        summary: {
          queryType: result.summary.queryType,
          counters: result.summary.counters,
          resultConsumedAfter: result.summary.resultConsumedAfter.toNumber(),
          resultAvailableAfter: result.summary.resultAvailableAfter.toNumber()
        }
      }

      const executionTime = endTime - startTime
      const responseText = `Query executed successfully in ${executionTime}ms\n` +
        `Query type: ${result.summary.queryType}\n` +
        `Records returned: ${records.length}\n\n` +
        `Results:\n${JSON.stringify(records, null, 2)}`

      return {
        content: [
          {
            type: 'text',
            text: responseText
          }
        ],
        structured_content: queryResult
      }
    } catch (error) {
      console.error('Error executing Cypher query:', error)
      throw new Error(`Failed to execute Cypher query: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      await session.close()
    }
  }

  private isWriteQuery(query: string): boolean {
    const writePatterns = /\b(MERGE|CREATE|SET|DELETE|REMOVE|ADD)\b/i
    return writePatterns.test(query)
  }

  private serializeNeo4jValue(value: any): any {
    if (value === null || value === undefined) {
      return null
    }

    // Handle Neo4j types
    if (value.constructor.name === 'Node') {
      return {
        identity: value.identity.toNumber(),
        labels: value.labels,
        properties: this.serializeNeo4jValue(value.properties)
      }
    }

    if (value.constructor.name === 'Relationship') {
      return {
        identity: value.identity.toNumber(),
        start: value.start.toNumber(),
        end: value.end.toNumber(),
        type: value.type,
        properties: this.serializeNeo4jValue(value.properties)
      }
    }

    if (value.constructor.name === 'Path') {
      return {
        start: this.serializeNeo4jValue(value.start),
        end: this.serializeNeo4jValue(value.end),
        segments: value.segments.map((segment: any) => ({
          start: this.serializeNeo4jValue(segment.start),
          relationship: this.serializeNeo4jValue(segment.relationship),
          end: this.serializeNeo4jValue(segment.end)
        }))
      }
    }

    // Handle Neo4j Integer
    if (value.constructor.name === 'Integer') {
      return value.toNumber()
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(item => this.serializeNeo4jValue(item))
    }

    // Handle objects
    if (typeof value === 'object') {
      const result: any = {}
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.serializeNeo4jValue(val)
      }
      return result
    }

    return value
  }

  async close(): Promise<void> {
    await this.driver.close()
  }
}

export { Neo4jSchemaTool, Neo4jQueryTool }