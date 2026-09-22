import { loadEnvFile } from "node:process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { createOpenAIProvider } from "../lib/generation/openai-provider";
import { generateCase } from "../lib/generation/pipeline";

async function main() {
  if (existsSync(".env.local")) loadEnvFile(".env.local");
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("Configure OPENAI_API_KEY in .env.local first.");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  const args = process.argv.slice(2);
  if (args.length > 1) throw new Error("Pass one quoted premise, or no arguments for the default premise.");
  const premise = args[0] || "A rare illustrated atlas disappears from a locked display cabinet during a private viewing at a small maritime museum. Three suspects remain in the building. Use a direct physical theft with plausible access credentials and independent continuous alibi records.";
  const id = `case-${randomUUID()}`;
  const { provider, usage } = createOpenAIProvider(apiKey, model);
  console.log("Generating one private development case (up to 5 API calls, 3 minutes total)...");
  const result = await generateCase(provider, { id, premise });
  await mkdir(".local/cases", { recursive: true });
  const path = `.local/cases/${id}.json`;
  await writeFile(path, JSON.stringify({ generatedAt: new Date().toISOString(), premise, model, usage, ...result }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify({ status: result.status, path, attempts: result.attempts, issues: result.issues, usage }, null, 2));
  if (result.status === "quarantined") process.exitCode = 2;
}

main().catch(error => {
  // Never print raw provider errors, headers, request objects, or credential values.
  if (error instanceof OpenAI.APIError) {
    if (error.code === "credit_balance_exhausted" || error.code === "insufficient_quota") {
      console.error("OpenAI API credits or quota are exhausted. Check https://platform.openai.com/settings/organization/billing and organization limits. No case was generated.");
    } else if (error.code === "rate_limit_exceeded") {
      console.error("OpenAI rate limit reached. Wait before retrying; no automatic retry was made.");
    } else {
      console.error(`OpenAI request failed (HTTP ${error.status ?? "unknown"}). Check account access and model configuration.`);
    }
  } else if (error instanceof Error && /abort|timeout/i.test(error.name + error.message)) {
    console.error("Generation stopped at its time limit. No case was admitted.");
  } else {
    console.error("Generation failed. Check local configuration and structured-output validity. No case was admitted.");
  }
  process.exitCode = 1;
});
