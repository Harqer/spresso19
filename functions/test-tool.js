const { genkit } = require("genkit");
const { z } = require("zod");

const ai = genkit({});

const myTool = ai.defineTool({
  name: "myTool",
  description: "test",
  inputSchema: z.object({ msg: z.string() }),
}, async (input, ctx) => {
  console.log("Input:", input);
  console.log("Context:", ctx);
  return { success: true };
});

myTool({ msg: "hello" }, { context: { auth: { uid: "user123" } } }).then(console.log);
