import { edgeTextToSpeech } from "../src/lib/edge-tts";

async function main() {
  const a = await edgeTextToSpeech("Γεια σας από τον βοηθό.", "el");
  console.log("el bytes", a.byteLength);
  const b = await edgeTextToSpeech("Hello from the assistant.", "en");
  console.log("en bytes", b.byteLength);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
