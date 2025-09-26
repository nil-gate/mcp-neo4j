import { GetTools, Neo4jMCPServer } from '../src/index.js'
import { Neo4jConfig, MCPTool } from '../src/types.js'

// Example configuration
const config: Neo4jConfig = {
  uri: 'bolt://localhost:7687',
  username: 'neo4j',
  password: 'your-password',
  database: 'neo4j' // optional, defaults to 'neo4j'
}

async function exampleUsage() {
  // Method 1: Using the GetTools factory function (following webpage generator pattern)
  console.log('=== Using GetTools factory function ===')
  const tools: MCPTool[] = GetTools(config, { readOnly: false })
  
  console.log('Available tools:')
  tools.forEach(tool => {
    console.log(`- ${tool.name}: ${tool.description}`)
  })

  // Method 2: Using the Neo4jMCPServer class directly
  console.log('\\n=== Using Neo4jMCPServer class ===')
  const server = new Neo4jMCPServer(config, { readOnly: false })

  try {
    // Get database schema
    console.log('\\n--- Getting Neo4j Schema ---')
    const schemaResult = await server.executeTool('get_neo4j_schema', {})
    console.log('Schema result type:', typeof schemaResult)
    console.log('Schema has content:', schemaResult.content?.length > 0)

    // Execute a simple query
    console.log('\\n--- Executing Cypher Query ---')
    const queryResult = await server.executeTool('run_cypher_query', {
      cypher: 'MATCH (n) RETURN count(n) as total_nodes LIMIT 1'
    })
    console.log('Query result type:', typeof queryResult)
    console.log('Query has content:', queryResult.content?.length > 0)

    // Execute a parameterized query
    console.log('\\n--- Executing Parameterized Query ---')
    const paramQueryResult = await server.executeTool('run_cypher_query', {
      cypher: 'MATCH (n) WHERE n.name = $name RETURN n LIMIT $limit',
      parameters: {
        name: 'John',
        limit: 10
      }
    })
    console.log('Parameterized query result type:', typeof paramQueryResult)

  } catch (error) {
    console.error('Error during execution:', error instanceof Error ? error.message : String(error))
  } finally {
    // Always close the connection
    await server.close()
    console.log('\\nConnection closed successfully')
  }
}

// Example of read-only usage
async function readOnlyExample() {
  console.log('\\n=== Read-Only Mode Example ===')
  const readOnlyServer = new Neo4jMCPServer(config, { readOnly: true })

  try {
    // This should work (read query)
    await readOnlyServer.executeTool('run_cypher_query', {
      cypher: 'MATCH (n) RETURN count(n) as total'
    })
    console.log('Read query executed successfully')

    // This should fail (write query)
    try {
      await readOnlyServer.executeTool('run_cypher_query', {
        cypher: 'CREATE (n:TestNode {name: "test"})'
      })
    } catch (error) {
      console.log('Write query correctly blocked:', error instanceof Error ? error.message : String(error))
    }

  } finally {
    await readOnlyServer.close()
  }
}

// Example error handling
async function errorHandlingExample() {
  console.log('\\n=== Error Handling Examples ===')
  const server = new Neo4jMCPServer(config)

  try {
    // Invalid tool name
    try {
      await server.executeTool('invalid_tool', {})
    } catch (error) {
      console.log('Invalid tool error:', error instanceof Error ? error.message : String(error))
    }

    // Invalid query syntax
    try {
      await server.executeTool('run_cypher_query', {
        cypher: 'INVALID CYPHER SYNTAX'
      })
    } catch (error) {
      console.log('Invalid query handled:', error instanceof Error ? 'Error caught' : 'Unexpected error type')
    }

    // Missing required parameters
    try {
      await server.executeTool('run_cypher_query', {
        // Missing cypher parameter
        parameters: { test: 'value' }
      })
    } catch (error) {
      console.log('Missing parameter error:', error instanceof Error ? error.message : String(error))
    }

  } finally {
    await server.close()
  }
}

// Main execution
async function main() {
  console.log('Neo4j MCP TypeScript Server Examples')
  console.log('====================================')
  
  // Note: These examples require a running Neo4j instance
  // Uncomment the following lines to run actual examples:
  
  // await exampleUsage()
  // await readOnlyExample()  
  // await errorHandlingExample()
  
  console.log('\\nTo run these examples:')
  console.log('1. Start a Neo4j instance')
  console.log('2. Update the config with your connection details')
  console.log('3. Uncomment the example function calls above')
  console.log('4. Run: npm run build && node dist/examples/usage.js')
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}