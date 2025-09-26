import { z } from 'zod'

// MCP Tool interface based on the webpage generator example
export interface MCPTool {
  name: string
  description: string
  args: z.ZodType<any>
  handler(data: any): Promise<any>
}

// MCP response types
export interface TextContent {
  type: 'text'
  text: string
}

export interface ToolResult {
  content: TextContent[]
  structured_content?: any
}

// Neo4j connection configuration
export interface Neo4jConfig {
  uri: string
  username: string
  password: string
  database?: string
}

// Neo4j schema types
export interface NodeSchema {
  type: string
  count?: number
  labels?: string[]
  properties?: Record<string, PropertySchema>
  relationships?: Record<string, RelationshipSchema>
}

export interface PropertySchema {
  type: string
  indexed?: boolean
}

export interface RelationshipSchema {
  direction: string
  labels?: string[]
  properties?: Record<string, PropertySchema>
}

export interface Neo4jSchemaResult {
  [key: string]: NodeSchema
}

// Query execution result
export interface QueryResult {
  records: any[]
  summary: {
    queryType: string
    counters: any
    resultConsumedAfter: number
    resultAvailableAfter: number
  }
}