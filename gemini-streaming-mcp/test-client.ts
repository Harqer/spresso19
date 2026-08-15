import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as dotenv from "dotenv";

dotenv.config();

async function run() {
  console.log("Starting MCP Client...");
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/index.js"],
    env: { ...process.env },
  });

  const client = new Client({
    name: "test-client",
    version: "1.0.0",
  }, {
    capabilities: {}
  });

  await client.connect(transport);
  console.log("Connected to MCP Server!");

  const toolsResponse = await client.listTools();
  console.log("Available tools:", toolsResponse.tools.map(t => t.name).join(", "));

  console.log("\nCalling generate_text_stream tool...");
  const result = await client.callTool({
    name: "generate_text_stream",
    arguments: {
      prompt: "Tell me a very short 2-sentence story about a brave toaster.",
    }
  });

  console.log("\nResult from tool:");
  console.log(JSON.stringify(result, null, 2));

  await transport.close();
}

run().catch(console.error);
