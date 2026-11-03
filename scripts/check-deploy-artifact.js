import { resolve } from "node:path";
import { auditSite } from "./site-artifact.js";

const siteDir = resolve(process.argv[2] || "_site");
const problems = auditSite(siteDir);
if (problems.length) {
  console.error("Deploy artifact is incomplete:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log(`Deploy artifact includes every file the app requests (${siteDir}).`);
