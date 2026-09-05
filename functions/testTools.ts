import { chefAgent } from "./src/ai/tools/chefAgent";

async function verify() {
  console.log("Verifying chefAgent tool...");
  try {
    const result = await chefAgent({ topic: "recipe for pasta" });
    console.log("Result:", result);
    console.log("Verdict: PASSED");
    process.exit(0);
  } catch (error) {
    console.error("Error executing chefAgent:", error);
    console.log("Verdict: FAILED");
    process.exit(1);
  }
}

verify();
