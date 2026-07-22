// Smoke test for the pure scene engine — no editor, no dev server.
//   node scripts/smoke-scenes.mjs
import assert from "node:assert/strict";
import { sceneNumber, toScenes } from "../src/lib/scenes.mjs";

// sceneNumber: leading integer or null.
assert.equal(sceneNumber("1 Intro"), 1);
assert.equal(sceneNumber("12 Outro"), 12);
assert.equal(sceneNumber("  3 padded"), 3);
assert.equal(sceneNumber("Moodboard"), null);
assert.equal(sceneNumber(""), null);
assert.equal(sceneNumber(null), null);

// toScenes: the spec case — 3 frames, one non-numeric, order by number not input.
const scenes = toScenes([
  { id: "f2", name: "2 Hook" },
  { id: "f1", name: "1 Intro" },
  { id: "f3", name: "Moodboard" },
]);
assert.equal(scenes.length, 2, "Moodboard is not a scene");
assert.deepEqual(scenes.map((s) => s.id), ["f1", "f2"], "sorted by leading number");
assert.deepEqual(scenes.map((s) => s.num), [1, 2]);

// Empty page → no scenes, no throw.
assert.deepEqual(toScenes([]), []);

console.log("✓ smoke-scenes passed");
