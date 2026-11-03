import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { assembleSite } from "./site-artifact.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dest = assembleSite(root, resolve(root, "www"));
console.log(dest);
