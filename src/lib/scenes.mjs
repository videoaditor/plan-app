// Scene engine for Studio mode. A scene is any tldraw frame whose name starts
// with a number ("1 Intro", "2 Hook") — the numeric prefix is the order. That
// naming convention is the whole data contract; frames are the single source of
// truth, there is no parallel scene model. Pure helpers live here (node-testable,
// same .mjs precedent as migrate.mjs); the editor-bound ones take an untyped editor.

// Leading integer of a frame name, or null if it doesn't start with a number.
export function sceneNumber(name) {
  const m = String(name ?? "").trim().match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

// Pure core: [{id, name}] → sorted [{id, num, name}], numeric frames only.
export function toScenes(frames) {
  return frames
    .map((f) => ({ id: f.id, name: f.name, num: sceneNumber(f.name) }))
    .filter((s) => s.num !== null)
    .sort((a, b) => a.num - b.num);
}

// Scenes on the editor's current page, in order.
export function getScenes(editor) {
  const frames = editor
    .getCurrentPageShapes()
    .filter((s) => s.type === "frame")
    .map((s) => ({ id: s.id, name: s.props.name || "" }));
  return toScenes(frames);
}

// Smooth tldraw camera move to a scene's frame (no CSS transforms — those fight
// tldraw, see TldrawCanvas.tsx). Returns false if the frame has no bounds.
export function zoomToScene(editor, sceneId) {
  const bounds = editor.getShapePageBounds(sceneId);
  if (!bounds) return false;
  editor.zoomToBounds(bounds, { animation: { duration: 1000 }, inset: 64 });
  return true;
}
