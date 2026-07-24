/** Validate every content/lessons/lesson-*.json against the shared Zod schema. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { lessonSchema } from "../shared/lesson";

const dir = join(process.cwd(), "content", "lessons");
let failures = 0;
for (const file of readdirSync(dir).filter(f => f.endsWith(".json")).sort()) {
  const data = JSON.parse(readFileSync(join(dir, file), "utf8"));
  const result = lessonSchema.safeParse(data);
  if (!result.success) {
    failures += 1;
    console.error(`FAIL ${file}:`, result.error.issues.slice(0, 3));
  }
}
console.log(failures === 0 ? "All lessons valid ✅" : `${failures} lessons failed`);
process.exit(failures === 0 ? 0 : 1);
