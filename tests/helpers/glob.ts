import fs from 'fs-extra';
import path from 'path';

/** Recursively collect every .ts file under dir (absolute paths). Missing dir → []. */
export async function globTsFiles(dir: string): Promise<string[]> {
  if (!(await fs.pathExists(dir))) return [];
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await globTsFiles(full)));
    } else if (entry.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out.sort();
}
