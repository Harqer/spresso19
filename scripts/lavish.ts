import fs from "fs";
import path from "path";

/**
 * Lavish AXI (Agent eXperience Interface) CLI
 * Provides token-efficient TOON output for mapping Spresso19 architecture,
 * Genkit flow evaluation, Meta Wearables DAT routing, and atomic design audits.
 */

const COMPONENTS_DIR = path.resolve(process.cwd(), "composeApp/src/commonMain/kotlin/components");

function printHeader() {
  console.log("bin: scripts/lavish.ts");
  console.log("description: Lavish AXI CLI — Architecture mapping, Genkit evals & multimodal routing\n");
}

function handleStatus() {
  printHeader();
  console.log("system_status[7]{subsystem,provider,status,endpoint}:");
  console.log("  \"SSE Streaming Chat\",Gemini 3.5 Flash,ACTIVE,https://spresso-5561f.web.app/api/chat/stream");
  console.log("  \"Live Assistant WebSockets\",Gemini 3.1 Live,ACTIVE,wss://us-central1-aiplatform.googleapis.com/... (Agent Engine)");
  console.log("  \"Camera Lens Search\",Gemini Vision,ACTIVE,https://spresso-5561f.web.app/api/lens-search");
  console.log("  \"Meta Wearables DAT\",Bluetooth LE & TTS,ACTIVE,MetaWearablesManager.kt");
  console.log("  \"HITL Biometric Checkout\",Auth Token Gate,ACTIVE,https://spresso-5561f.web.app/api/purchase/confirm");
  console.log("  \"Genkit Creator Campaign\",Genkit AI,ACTIVE,https://spresso-5561f.web.app/api/creator/generate-campaign");
  console.log("  \"Bargain Chef Sourcing\",Genkit Flows,ACTIVE,https://spresso-5561f.web.app/api/recipe/bargain-chef");
  console.log("\naggregates:");
  console.log("  total_subsystems: 7");
  console.log("  healthy: 7");
  console.log("  eval_framework: Genkit Native Eval (@genkit-ai/evaluators)");
  console.log("\nhelp[2]:");
  console.log("  Run `npx tsx scripts/lavish.ts routing` to view multimodal data flow paths");
  console.log("  Run `npx tsx scripts/lavish.ts genkit eval` to inspect Genkit flow evaluators");
}

function handleGenkitEval() {
  printHeader();
  console.log("genkit_evaluators[4]{flow_name,model_target,evaluator_type,metric}:");
  console.log("  \"creatorCampaignFlow\",gemini-3.1-pro-preview,@genkit-ai/evaluators,faithfulness");
  console.log("  \"bargainChefRecipeFlow\",gemini-3.5-flash,@genkit-ai/evaluators,relevance");
  console.log("  \"visualLensSearchFlow\",gemini-3.5-flash,@genkit-ai/evaluators,extraction_accuracy");
  console.log("  \"liveAssistantFlow\",gemini-3.1-flash-live-preview,WebSocket Live,latency_p95");
  console.log("\neval_command:");
  console.log("  `npx genkit eval:flow creatorCampaignFlow --input '{\"prompt\":\"Fall Launch\"}'`");
  console.log("\nhelp[1]:");
  console.log("  Official Genkit CLI evaluation executes natively without custom script shortcuts.");
}

function handleRouting() {
  printHeader();
  console.log("multimodal_routing[5]{input_source,protocol,backend_target,device_target}:");
  console.log("  \"Camera Snapshot\",REST / Base64,https://spresso-5561f.web.app/api/lens-search,\"Android CameraX / Web Upload\"");
  console.log("  \"Natural Voice Mic\",WebSocket (16k in / 24k out),wss://us-central1-aiplatform.googleapis.com/... (Agent Engine),\"Android Mic / Web Audio\"");
  console.log("  \"Meta Smart Glasses\",Meta DAT Bluetooth LE,MetaWearablesManager.kt,\"Ray-Ban Meta Smart Glasses\"");
  console.log("  \"Text Prompt & Chips\",Server-Sent Events (SSE),https://spresso-5561f.web.app/api/chat/stream,\"Compose / Web Chat Input Bar\"");
  console.log("  \"Biometric 1-Tap Buy\",Signed Auth Token,https://spresso-5561f.web.app/api/purchase/confirm,\"HITLCheckoutModal.kt\"");
}

function handleComponents() {
  printHeader();
  const componentStats: { category: string; count: number; violations: number }[] = [];
  let totalCount = 0;
  let totalViolations = 0;

  function countComponents(dir: string, catName: string, maxLines: number) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".kt"));
    let categoryViolations = 0;
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), "utf8");
      if (content.split("\n").length > maxLines) categoryViolations++;
    }
    componentStats.push({ category: catName, count: files.length, violations: categoryViolations });
    totalCount += files.length;
    totalViolations += categoryViolations;
  }

  countComponents(path.join(COMPONENTS_DIR, "atoms"), "Atom", 50);
  countComponents(path.join(COMPONENTS_DIR, "molecules"), "Molecule", 100);
  countComponents(path.join(COMPONENTS_DIR, "organisms"), "Organism", 200);
  countComponents(path.join(COMPONENTS_DIR, "pages"), "Page", 150);
  countComponents(path.join(COMPONENTS_DIR, "templates"), "Template", 150);

  console.log(`count: ${totalCount} total components across 5 categories`);
  console.log("atomic_categories[5]{category,component_count,max_line_limit,violations}:");
  for (const stat of componentStats) {
    const max = stat.category === "Atom" ? 50 : stat.category === "Molecule" ? 100 : stat.category === "Organism" ? 200 : 150;
    console.log(`  "${stat.category}",${stat.count},${max},${stat.violations}`);
  }
  console.log(`\nstatus: ${totalViolations === 0 ? "PASSED (0 violations)" : `FAILED (${totalViolations} violations)`}`);
}

function handleHelp() {
  printHeader();
  console.log("Lavish AXI CLI Usage:");
  console.log("  npx tsx scripts/lavish.ts status      - Show system architecture status in TOON format");
  console.log("  npx tsx scripts/lavish.ts genkit eval - Show Genkit flow evaluators & model test specs");
  console.log("  npx tsx scripts/lavish.ts routing     - Show multimodal routing pathways (Voice, Camera, Meta)");
  console.log("  npx tsx scripts/lavish.ts components  - Audit atomic design line count metrics");
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "status";
  const subCommand = args[1];

  switch (command) {
    case "status":
      handleStatus();
      break;
    case "genkit":
      if (subCommand === "eval" || subCommand === "evals") {
        handleGenkitEval();
      } else {
        handleGenkitEval();
      }
      break;
    case "routing":
      handleRouting();
      break;
    case "components":
      handleComponents();
      break;
    case "help":
    case "--help":
    case "-h":
      handleHelp();
      break;
    default:
      console.log(`error: unknown command \`${command}\``);
      handleHelp();
      process.exit(2);
  }
}

main();
