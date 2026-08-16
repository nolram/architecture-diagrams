#!/usr/bin/env -S npx tsx
// Verifies that every entry in src/icons/catalog.ts still actually resolves
// against the installed packages (thesvg / @iconify-json/mdi). Protects
// against thesvg renaming/removing a slug in an update and the icon only
// being noticed as visually broken at render time.
import { ICON_CATALOG } from "../src/icons/catalog.js";
import { resolveIcon } from "../src/icons/resolve.js";

async function main() {
  const failures: string[] = [];

  for (const entry of ICON_CATALOG) {
    const result = await resolveIcon(entry.key);
    if (!result.ok) {
      const reason =
        entry.source === "thesvg"
          ? `slug "${entry.ref}" no longer exists in the installed thesvg package`
          : `key "${entry.ref}" does not exist in @iconify-json/mdi`;
      failures.push(`${entry.key}: ${reason}`);
    }
  }

  if (failures.length > 0) {
    console.error(`${failures.length} of ${ICON_CATALOG.length} catalog entries don't resolve:\n`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  console.log(`Icon catalog is healthy: ${ICON_CATALOG.length} entries resolved successfully.`);
}

main();
