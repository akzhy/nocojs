import { rm } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default async function globalSetup() {
  try {
    await rm(`${__dirname}/.cache`, { recursive: true, force: true });
  } catch (e) {
    console.error('Failed to remove cache directory before tests:', e);
  }
}
