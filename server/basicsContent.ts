import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  BasicsManifest,
  BasicsModule,
  BasicsModuleId,
  BasicsModuleSummary,
  StrokeFile,
} from "../shared/basics";
import {
  BASICS_MODULE_IDS,
  basicsManifestSchema,
  basicsModuleSchema,
  strokeFileSchema,
} from "../shared/basics";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const basicsDirectory = path.join(projectRoot, "content", "basics");
const modulesDirectory = path.join(basicsDirectory, "modules");
const strokesDirectory = path.join(basicsDirectory, "strokes");
const manifestPath = path.join(basicsDirectory, "manifest.json");

let moduleCache: BasicsModule[] | null = null;
let manifestCache: BasicsManifest | null = null;
let strokeCache: Map<string, StrokeFile> | null = null;

function readModuleFile(filePath: string): BasicsModule {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return basicsModuleSchema.parse(raw);
}

export function getBasicsManifest(options?: { refresh?: boolean }): BasicsManifest {
  if (manifestCache && !options?.refresh) return manifestCache;
  const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifestCache = basicsManifestSchema.parse(raw);
  return manifestCache;
}

/**
 * Ensure every write step `strokeId` resolves to a stroke file under content/basics/strokes.
 * Throws a clear error listing missing references.
 */
export function assertWriteStrokeReferences(
  modules: BasicsModule[],
  strokeMap?: Map<string, StrokeFile>,
): void {
  const strokes = strokeMap ?? loadStrokeCache();
  const missing: string[] = [];
  for (const mod of modules) {
    for (const step of mod.steps) {
      if (step.type !== "write") continue;
      for (const item of step.items) {
        if (!strokes.has(item.strokeId)) {
          missing.push(`${mod.id}/${step.id}/${item.id} → strokeId "${item.strokeId}"`);
        }
      }
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing stroke files for write items:\n${missing.join("\n")}`);
  }
}

export function getAllBasicsModules(options?: { refresh?: boolean }): BasicsModule[] {
  if (moduleCache && !options?.refresh) return moduleCache;

  const files = fs
    .readdirSync(modulesDirectory)
    .filter(file => file.endsWith(".json"))
    .sort();

  const modules = files.map(file => readModuleFile(path.join(modulesDirectory, file)));
  modules.sort((a, b) => a.order - b.order);

  if (modules.length !== BASICS_MODULE_IDS.length) {
    throw new Error(
      `Expected ${BASICS_MODULE_IDS.length} basics modules, found ${modules.length}`,
    );
  }

  for (const id of BASICS_MODULE_IDS) {
    if (!modules.some(m => m.id === id)) {
      throw new Error(`Missing basics module: ${id}`);
    }
  }

  assertWriteStrokeReferences(modules);

  moduleCache = modules;
  return modules;
}

export function getBasicsModule(id: BasicsModuleId | string): BasicsModule | undefined {
  return getAllBasicsModules().find(module => module.id === id);
}

export function getBasicsModuleSummaries(): BasicsModuleSummary[] {
  return getAllBasicsModules().map(module => ({
    id: module.id,
    order: module.order,
    title: module.title,
    estimatedMinutes: module.estimatedMinutes,
    stepCount: module.steps.length,
    hasQuiz: module.steps.some(s => s.type === "quiz"),
  }));
}

function loadStrokeCache(options?: { refresh?: boolean }): Map<string, StrokeFile> {
  if (strokeCache && !options?.refresh) return strokeCache;
  const map = new Map<string, StrokeFile>();
  if (!fs.existsSync(strokesDirectory)) {
    strokeCache = map;
    return map;
  }
  const files = fs.readdirSync(strokesDirectory).filter(file => file.endsWith(".json"));
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(strokesDirectory, file), "utf8"));
    const parsed = strokeFileSchema.parse(raw);
    map.set(parsed.id, parsed);
    map.set(parsed.char, parsed);
  }
  strokeCache = map;
  return map;
}

export function getStrokeFile(idOrChar: string): StrokeFile | undefined {
  return loadStrokeCache().get(idOrChar);
}

export function getAllStrokeFiles(options?: { refresh?: boolean }): StrokeFile[] {
  const map = loadStrokeCache(options);
  const byId = new Map<string, StrokeFile>();
  for (const file of map.values()) {
    byId.set(file.id, file);
  }
  return [...byId.values()];
}

/** Clear caches (tests / hot reload). */
export function clearBasicsContentCache(): void {
  moduleCache = null;
  manifestCache = null;
  strokeCache = null;
}
