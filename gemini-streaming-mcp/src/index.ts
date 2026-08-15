import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "gemini-cookbook-docs-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      resources: {},
    },
  }
);

// We will expose the streaming quickstart as an MCP resource
const STREAMING_DOC_URL = "https://fallendeity.github.io/gemini-ts-cookbook/quickstarts/Streaming.html";
const RESOURCE_URI = "gemini-cookbook://quickstarts/streaming";

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: RESOURCE_URI,
        name: "Gemini Streaming Quickstart Documentation",
        description: "Documentation for the Gemini Streaming Quickstart using @google/genai",
        mimeType: "text/html",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === RESOURCE_URI) {
    try {
      console.error(`Fetching documentation from ${STREAMING_DOC_URL}...`);
      const response = await fetch(STREAMING_DOC_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch docs: ${response.statusText}`);
      }
      
      const htmlContent = await response.text();
      
      return {
        contents: [
          {
            uri: RESOURCE_URI,
            mimeType: "text/html",
            text: htmlContent,
          },
        ],
      };
    } catch (error) {
      console.error("Error reading resource:", error);
      throw error;
    }
  }

  throw new Error(`Resource not found: ${request.params.uri}`);
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gemini Cookbook Docs MCP Server running on stdio");
}

runServer().catch(console.error);
