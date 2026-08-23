import { getAllLessons } from "../server/content";
import { buildTransferItems, transferItemSchema } from "../shared/transfer";

const lessons = getAllLessons();
const items = buildTransferItems(lessons);
const ids = new Set<string>();
const formats = new Map<string, number>();
const answerPositions = new Set<number>();
const errors: string[] = [];
for (const item of items) {
  if (ids.has(item.id)) errors.push(`duplicate id: ${item.id}`);
  ids.add(item.id);
  formats.set(item.format, (formats.get(item.format) ?? 0) + 1);
  const answerPosition = item.options.findIndex(option => option.id === item.answerOptionId);
  if (answerPosition >= 0) answerPositions.add(answerPosition);
  const parsed = transferItemSchema.safeParse(item);
  if (!parsed.success) errors.push(`invalid ${item.id}: ${parsed.error.issues.map(issue => issue.message).join(", ")}`);
  if (item.format === "short-typed" && item.acceptedAnswers.length === 0) errors.push(`missing accepted answer: ${item.id}`);
  if (item.format !== "short-typed" && item.options.length !== 4 && item.format !== "word-to-situation" && item.format !== "cloze" && item.format !== "listening-to-meaning") errors.push(`unexpected option count: ${item.id}`);
}
console.log(`lessons=${lessons.length} transfer_items=${items.length} unique=${ids.size}`);
console.log(`formats=${JSON.stringify(Object.fromEntries(formats))}`);
console.log(`answer_positions=${JSON.stringify([...answerPositions].sort())}`);
if (answerPositions.size < 2) errors.push("choice answer positions are not varied");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("issues=0");
