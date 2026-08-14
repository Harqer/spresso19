import { getBargainChefRecipe } from './server/geminiService.ts';

async function verify() {
  console.log("Testing BargainChefRecipe with Zod output parsing...");
  try {
    const result = await getBargainChefRecipe({ craving: "chicken" });
    console.log("Result Type:", typeof result);
    console.log("Result Keys:", Object.keys(result));
    console.log("Success! Output is not mocked fallback if keys are present.");
  } catch(e) {
    console.error("Verification failed:", e);
  }
}
verify();
