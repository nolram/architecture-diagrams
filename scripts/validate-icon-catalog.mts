#!/usr/bin/env -S npx tsx
// Verifica que toda entrada de src/icons/catalog.ts ainda resolve de verdade
// contra os pacotes instalados (thesvg / @iconify-json/mdi). Protege contra o
// thesvg renomear/remover um slug numa atualização e o ícone só ser percebido
// quebrado visualmente, na hora do render.
import { ICON_CATALOG } from "../src/icons/catalog.js";
import { resolveIcon } from "../src/icons/resolve.js";

async function main() {
  const failures: string[] = [];

  for (const entry of ICON_CATALOG) {
    const result = await resolveIcon(entry.key);
    if (!result.ok) {
      const reason =
        entry.source === "thesvg"
          ? `slug "${entry.ref}" não existe mais no pacote thesvg instalado`
          : `chave "${entry.ref}" não existe em @iconify-json/mdi`;
      failures.push(`${entry.key}: ${reason}`);
    }
  }

  if (failures.length > 0) {
    console.error(`${failures.length} de ${ICON_CATALOG.length} entrada(s) do catálogo não resolvem:\n`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  console.log(`Catálogo de ícones íntegro: ${ICON_CATALOG.length} entradas resolvidas com sucesso.`);
}

main();
