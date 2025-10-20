import { rm } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function globalSetup() {
  try {
    await rm(`${__dirname}/.cache`, { recursive: true, force: true });
  } catch (e) {
    console.error("Failed to remove cache directory before tests:", e);
  }
}
