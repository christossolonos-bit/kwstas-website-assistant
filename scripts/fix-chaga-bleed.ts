import fs from "fs";
import path from "path";

const BAD = "Use Super Lax Support for constipation for up to 10 days ";
const SAFETY = "Use Super Lax Support for constipation for up to 10 days.";

const root = process.cwd();
const files = [
  "data/ygia-pro-booklet-parsed.json",
  "data/knowledge.json",
  "data/product-usage-faqs-full.json",
];

for (const f of files) {
  const p = path.join(root, f);
  let t = fs.readFileSync(p, "utf8");
  let n = 0;
  while (t.includes(BAD)) {
    t = t.replace(BAD, "");
    n += 1;
  }
  if (n) {
    fs.writeFileSync(p, t);
    console.log(f, "removed", n, "bleed(s)");
  } else {
    console.log(f, "clean");
  }
}

const parsedPath = path.join(root, "data/ygia-pro-booklet-parsed.json");
const parsed = JSON.parse(fs.readFileSync(parsedPath, "utf8")) as {
  products?: Array<{ name: string; safety?: string; actions?: string }>;
};
const products = parsed.products || [];
const lax = products.find((p) => /super lax/i.test(p.name));
if (lax) {
  lax.safety = SAFETY;
  fs.writeFileSync(parsedPath, JSON.stringify(parsed, null, 2) + "\n");
  console.log("Super Lax safety set");
}
const chaga = products.find((p) => /chaga/i.test(p.name));
console.log("Chaga actions start:", chaga?.actions?.slice(0, 80));
