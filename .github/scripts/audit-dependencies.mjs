import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const result = spawnSync("npm", ["audit", "--json"], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
if (result.error) throw result.error;
const report = JSON.parse(result.stdout);
if (report.error || !report.vulnerabilities) {
  console.error(result.stderr || JSON.stringify(report.error));
  process.exit(1);
}
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const braceEntries = Object.entries(lock.packages).filter(([path]) => /(^|\/)node_modules\/braces$/.test(path));
const developmentOnly = braceEntries.length > 0 && braceEntries.every(([, pkg]) => pkg.dev === true);
// No published braces version fixes this advisory. This exception is restricted
// to the known development-only lint dependency; production audit stays strict.
const deferred = "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm";
const blocking = [];
let findings = 0;
for (const vulnerability of Object.values(report.vulnerabilities)) {
  for (const advisory of vulnerability.via) {
    if (typeof advisory !== "object" || !["moderate", "high", "critical"].includes(advisory.severity)) continue;
    findings += 1;
    if (advisory.url === deferred && vulnerability.name === "braces" && developmentOnly) {
      console.log("::warning::Unfixed development-only braces advisory: " + deferred);
    } else {
      blocking.push(advisory);
    }
  }
}
if (blocking.length || (result.status !== 0 && findings === 0)) {
  console.error(JSON.stringify(blocking.length ? blocking : report, null, 2));
  process.exit(1);
}
console.log("Dependency audit: no actionable moderate-or-higher advisories remain.");
