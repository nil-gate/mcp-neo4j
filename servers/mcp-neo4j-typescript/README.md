# TypeScript MCP Neo4j Server

A TypeScript implementation of the Neo4j Model Context Protocol (MCP) server, providing natural language interfaces to Neo4j graph databases.

## Features

- **Schema Introspection**: Get comprehensive database schema information
- **Query Execution**: Execute Cypher queries with parameter support
- **Read-only Mode**: Optional read-only mode for safe operations
- **Type Safety**: Full TypeScript support with proper type definitions
- **Error Handling**: Comprehensive error handling and validation
- **Neo4j Value Serialization**: Proper handling of Neo4j-specific data types

## Installation

```bash
npm install
npm run build
```

## Usage

### Command Line Interface

```bash
# Basic usage
npm run cli -- --db-url bolt://localhost:7687 --username neo4j --password password

# With environment variables
export NEO4J_URL=bolt://localhost:7687
export NEO4J_USERNAME=neo4j
export NEO4J_PASSWORD=password
npm run cli

# Read-only mode
npm run cli -- --db-url bolt://localhost:7687 --username neo4j --password password --read-only

# Interactive testing mode
npm run cli -- --db-url bolt://localhost:7687 --username neo4j --password password --interactive
```

### Programmatic Usage

```typescript
import { GetTools, Neo4jMCPServer } from './src/index.js'
import { Neo4jConfig } from './src/types.js'

const config: Neo4jConfig = {
  uri: 'bolt://localhost:7687',
  username: 'neo4j',
  password: 'password',
  database: 'neo4j'
}

// Get tools directly
const tools = GetTools(config, { readOnly: false })

// Or use the server class
const server = new Neo4jMCPServer(config, { readOnly: false })
const result = await server.executeTool('get_neo4j_schema', {})
console.log(result)

await server.close()
```

## Available Tools

### `get_neo4j_schema`

Retrieves the complete schema of the Neo4j database, including:
- Node labels and their properties
- Relationship types and their properties  
- Property types and indexing information
- Relationship directions and cardinalities

**Parameters**: None

**Example Response**:
```json
{
  "content": [
    {
      "type": "text", 
      "text": "{\n  \"Person\": {\n    \"type\": \"node\",\n    \"count\": 100,\n    \"properties\": {\n      \"name\": {\"type\": \"STRING\", \"indexed\": true},\n      \"age\": {\"type\": \"INTEGER\"}\n    }\n  }\n}"
    }
  ],
  "structured_content": {
    "schema": { ... }
  }
}
```

### `run_cypher_query`

Executes Cypher queries against the Neo4j database with full parameter support.

**Parameters**:
- `cypher` (string, required): The Cypher query to execute
- `parameters` (object, optional): Parameters for the query

**Example**:
```typescript
await server.executeTool('run_cypher_query', {
  cypher: 'MATCH (n:Person {name: $name}) RETURN n',
  parameters: { name: 'John' }
})
```

## Configuration

### Environment Variables

- `NEO4J_URL` or `NEO4J_URI`: Neo4j connection URL
- `NEO4J_USERNAME`: Database username  
- `NEO4J_PASSWORD`: Database password
- `NEO4J_DATABASE`: Database name (default: 'neo4j')

### Options

- `readOnly`: When true, prevents execution of write queries (CREATE, MERGE, SET, DELETE, etc.)

## Architecture

The implementation follows the MCP tool pattern as demonstrated in the webpage generator example:

```typescript
interface MCPTool {
  name: string
  description: string  
  args: z.ZodType<any>
  handler(data: any): Promise<any>
}
```

### Key Components

- **`Neo4jSchemaTool`**: Implements schema introspection using APOC procedures
- **`Neo4jQueryTool`**: Handles Cypher query execution with parameter binding
- **`Neo4jMCPServer`**: Main server class managing tool lifecycle
- **Type Definitions**: Comprehensive TypeScript types for all data structures

## Requirements

- Node.js 18+
- TypeScript 5+
- Neo4j 4.4+ with APOC plugin for schema introspection
- Neo4j JavaScript driver

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test (when implemented)
npm test

# Clean build directory
npm run clean
```

## Error Handling

The implementation includes comprehensive error handling:
- Connection validation
- Query syntax validation  
- Parameter type checking
- Neo4j driver error translation
- Read-only mode enforcement

## Data Type Handling

Properly serializes Neo4j-specific types:
- **Nodes**: Include identity, labels, and properties
- **Relationships**: Include identity, start/end nodes, type, and properties  
- **Paths**: Include start/end nodes and segments
- **Integers**: Convert Neo4j Integer to JavaScript number
- **Complex Objects**: Recursive serialization

## License

MIT License