#!/usr/bin/env node

import { program } from 'commander'
import { Neo4jMCPServer } from './index.js'
import { Neo4jConfig } from './types.js'

interface CLIOptions {
  dbUrl?: string
  username?: string
  password?: string
  database?: string
  readOnly?: boolean
  interactive?: boolean
}

async function main() {
  program
    .name('mcp-neo4j-typescript')
    .description('TypeScript Neo4j MCP Server')
    .version('0.1.0')
    .option('--db-url <url>', 'Neo4j connection URL', process.env.NEO4J_URL || process.env.NEO4J_URI)
    .option('--username <username>', 'Neo4j username', process.env.NEO4J_USERNAME)
    .option('--password <password>', 'Neo4j password', process.env.NEO4J_PASSWORD)
    .option('--database <database>', 'Neo4j database name', process.env.NEO4J_DATABASE || 'neo4j')
    .option('--read-only', 'Allow only read-only queries', false)
    .option('--interactive', 'Run in interactive mode for testing', false)

  program.parse()

  const options = program.opts<CLIOptions>()

  if (!options.dbUrl || !options.username || !options.password) {
    console.error('Error: Neo4j connection details are required')
    console.error('Please provide --db-url, --username, and --password options')
    console.error('Or set NEO4J_URL, NEO4J_USERNAME, and NEO4J_PASSWORD environment variables')
    process.exit(1)
  }

  const config: Neo4jConfig = {
    uri: options.dbUrl,
    username: options.username,
    password: options.password,
    database: options.database
  }

  const server = new Neo4jMCPServer(config, { readOnly: options.readOnly })

  if (options.interactive) {
    await runInteractiveMode(server)
  } else {
    console.log('Neo4j MCP Server initialized successfully')
    console.log('Available tools:', server.getTools().map(t => t.name).join(', '))
    console.log('Use --interactive flag to test tools interactively')
  }

  await server.close()
}

async function runInteractiveMode(server: Neo4jMCPServer) {
  console.log('\\n=== Neo4j MCP Server Interactive Mode ===')
  console.log('Available tools:')
  
  const tools = server.getTools()
  tools.forEach((tool, index) => {
    console.log(`${index + 1}. ${tool.name}: ${tool.description}`)
  })

  console.log('\\n--- Testing get_neo4j_schema tool ---')
  try {
    const schemaResult = await server.executeTool('get_neo4j_schema', {})
    console.log('Schema result:')
    console.log(schemaResult.content[0].text)
  } catch (error) {
    console.error('Error getting schema:', error instanceof Error ? error.message : String(error))
  }

  console.log('\\n--- Testing run_cypher_query tool with a simple query ---')
  try {
    const queryResult = await server.executeTool('run_cypher_query', {
      cypher: 'MATCH (n) RETURN count(n) as node_count LIMIT 1'
    })
    console.log('Query result:')
    console.log(queryResult.content[0].text)
  } catch (error) {
    console.error('Error executing query:', error instanceof Error ? error.message : String(error))
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}