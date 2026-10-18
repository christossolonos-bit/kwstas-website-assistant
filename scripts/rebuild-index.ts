import { rebuildIndex } from "../src/lib/rag/ingest";

async function main() {
  const result = await rebuildIndex();
  console.log("Rebuilt index:", result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
