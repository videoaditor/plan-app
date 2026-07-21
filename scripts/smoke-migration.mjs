// Migration smoke for the tldraw v3 upgrade (T1). Loads the v1 snapshot fixture
// (dumped from tldraw 2.4, scripts/fixtures/v1-snapshot.json) into a v3 store and
// asserts: no throw + identical shape count. Guards against silent data loss when
// old boards open after the upgrade. Pure node — no dev server, no browser.
//   node scripts/smoke-migration.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Store } from "@tldraw/store";
import { createTLSchema, defaultShapeSchemas, defaultBindingSchemas } from "@tldraw/tlschema";

const FIXTURE = path.join(process.cwd(), "scripts/fixtures/v1-snapshot.json");
const v1 = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));

const v1Shapes = Object.values(v1.store).filter((r) => r.typeName === "shape");
const v1Assets = Object.values(v1.store).filter((r) => r.typeName === "asset");
assert.ok(v1Shapes.length > 0, "fixture must contain shapes");
assert.ok(
  v1Shapes.some((s) => s.type === "media-embed"),
  "fixture must contain the custom media-embed shape (v3 ShapeUtil migration is the risk)"
);

// v3 schema = defaults + our custom media-embed shape (props/migrations empty, same
// as the 2.4 ShapeUtil which defined neither — so nothing to migrate, just accept it).
const schema = createTLSchema({
  shapes: { ...defaultShapeSchemas, "media-embed": {} },
  bindings: defaultBindingSchemas,
});

const store = new Store({ schema, props: {} });
// loadStoreSnapshot runs the v2→v3 migrations internally; throws on failure.
store.loadStoreSnapshot(v1);

const migrated = store.allRecords();
const outShapes = migrated.filter((r) => r.typeName === "shape");
const outAssets = migrated.filter((r) => r.typeName === "asset");

assert.equal(
  outShapes.length,
  v1Shapes.length,
  `shape count changed: ${v1Shapes.length} → ${outShapes.length}`
);
assert.equal(
  outAssets.length,
  v1Assets.length,
  `asset count changed: ${v1Assets.length} → ${outAssets.length}`
);
assert.ok(
  outShapes.some((s) => s.type === "media-embed"),
  "media-embed shape lost during migration"
);

console.log(
  `✓ smoke-migration passed — ${outShapes.length} shapes, ${outAssets.length} assets survived v2→v3 (${v1Shapes.map((s) => s.type).join(", ")})`
);
