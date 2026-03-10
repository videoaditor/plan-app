"use client";

import {
  Tldraw,
  useEditor,
  createShapeId,
  type Editor,
  type TLComponents,
  DefaultContextMenu,
  DefaultContextMenuContent,
  TldrawUiMenuGroup,
  TldrawUiMenuItem,
} from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  Wand2,
  Search,
} from "lucide-react";

import ToolRail from "./ToolRail";
import ZoomControls from "./ZoomControls";
import AiToolbar from "./AiToolbar";
import AnimationPicker, { getShapeAnimation, ShapeAnimations, type AnimationType } from "./AnimationPicker";
import ProcessingOverlay from "./ProcessingOverlay";
import GeneratePanel from "./GeneratePanel";
import SearchPanel from "./SearchPanel";
import PresentationMode from "./PresentationMode";

// ─── Context for panel state ─────────────────────────────────────────
interface CanvasPanelState {
  openGenerate: (referenceImageSrc?: string, referenceShapeId?: string) => void;
  openSearch: () => void;
}

const CanvasPanelContext = createContext<CanvasPanelState>({
  openGenerate: () => { },
  openSearch: () => { },
});

// ─── Custom context menu ─────────────────────────────────────────────
function AIContextMenu() {
  const editor = useEditor();
  const { openGenerate, openSearch } = useContext(CanvasPanelContext);

  const selectedShapes = editor.getSelectedShapes();
  const isEmptySelection = selectedShapes.length === 0;
  const hasSelection = selectedShapes.length > 0;

  return (
    <DefaultContextMenu>
      {isEmptySelection && (
        <TldrawUiMenuGroup id="ai-generate">
          <TldrawUiMenuItem
            id="ai-generate-image"
            label="Generate Image…"
            onSelect={() => openGenerate()}
          />
          <TldrawUiMenuItem
            id="ai-search-images"
            label="Search Images…"
            onSelect={() => openSearch()}
          />
        </TldrawUiMenuGroup>
      )}

      {/* Editorial Vox Tools */}
      <TldrawUiMenuGroup id="vox-tools">
        <TldrawUiMenuItem
          id="vox-headline"
          label="Add Vox Headline"
          icon="text"
          onSelect={() => {
            try {
              const vp = editor.getViewportPageBounds();
              const id = createShapeId();
              editor.createShape({
                id,
                type: "text",
                x: vp.x + vp.w / 2 - 150,
                y: vp.y + vp.h / 2 - 50,
                props: {
                  text: "BREAKING NEWS",
                  font: "serif",
                  size: "xl",
                  align: "middle",
                  color: "black",
                },
              });
              editor.select(id);
            } catch (e) {
              console.error("Failed to create headline:", e);
            }
          }}
        />
        <TldrawUiMenuItem
          id="vox-highlight"
          label="Add Yellow Highlight"
          icon="blob"
          onSelect={() => {
            try {
              const vp = editor.getViewportPageBounds();
              const id = createShapeId();
              editor.createShape({
                id,
                type: "geo",
                x: vp.x + vp.w / 2 - 100,
                y: vp.y + vp.h / 2 - 20,
                props: {
                  geo: "rectangle",
                  w: 200,
                  h: 40,
                  color: "yellow",
                  fill: "solid",
                },
              });
              editor.select(id);
            } catch (e) {
              console.error("Failed to create highlight:", e);
            }
          }}
        />
      </TldrawUiMenuGroup>
      <DefaultContextMenuContent />
    </DefaultContextMenu>
  );
}

// ─── Inner canvas UI (has access to useEditor) ───────────────────────
function CanvasUI({
  onMount,
}: {
  onMount: (editor: Editor) => void;
}) {
  const editor = useEditor();
  const { openGenerate, openSearch } = useContext(CanvasPanelContext);

  const [aiToolbarPos, setAiToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const [aiReferenceImage, setAiReferenceImage] = useState<{
    src: string;
    shapeId: string;
  } | null>(null);
  const [animPickerPos, setAnimPickerPos] = useState<{ x: number; y: number } | null>(null);
  const [animPickerShapeId, setAnimPickerShapeId] = useState<string | null>(null);
  const [animPickerCurrent, setAnimPickerCurrent] = useState<AnimationType>("none");

  useEffect(() => {
    onMount(editor);
  }, [editor, onMount]);

  // Sync camera position + zoom to CSS variables so canvas texture tracks with content
  useEffect(() => {
    const updateCamera = () => {
      const camera = editor.getCamera();
      const zoom = camera.z;
      const root = document.documentElement;
      root.style.setProperty("--canvas-zoom", String(zoom));
      root.style.setProperty("--canvas-x", `${camera.x * zoom}px`);
      root.style.setProperty("--canvas-y", `${camera.y * zoom}px`);
    };
    updateCamera();
    const unsub = editor.store.listen(updateCamera, { scope: "session" });
    return () => unsub();
  }, [editor]);

  // Listen for selection changes to show AI toolbar + animation picker
  useEffect(() => {
    const updateAiToolbar = () => {
      const shapes = editor.getSelectedShapes();
      const imageShape = shapes.find((s) => s.type === "image");

      if (imageShape && shapes.length >= 1) {
        const bounds = editor.getSelectionRotatedPageBounds();
        if (bounds) {
          try {
            // AI toolbar — top center
            const screenPoint = editor.pageToScreen({
              x: bounds.minX + bounds.w / 2,
              y: bounds.minY,
            });
            setAiToolbarPos({ x: screenPoint.x, y: screenPoint.y - 52 });

            // Animation picker — bottom right
            const bottomRight = editor.pageToScreen({
              x: bounds.maxX,
              y: bounds.maxY,
            });
            setAnimPickerPos({ x: bottomRight.x + 8, y: bottomRight.y - 36 });
            setAnimPickerShapeId(imageShape.id);
            setAnimPickerCurrent(getShapeAnimation(editor, imageShape.id));

            // Get reference image src
            const asset = editor.getAsset((imageShape.props as any).assetId);
            if (asset) {
              setAiReferenceImage({
                src: (asset.props as any).src as string,
                shapeId: imageShape.id,
              });
            }
          } catch {
            setAiToolbarPos(null);
            setAnimPickerPos(null);
          }
        }
      } else {
        setAiToolbarPos(null);
        setAiReferenceImage(null);
        setAnimPickerPos(null);
        setAnimPickerShapeId(null);
      }
    };

    const unsub = editor.store.listen(updateAiToolbar, { scope: "session" });
    return () => unsub();
  }, [editor, openGenerate, openSearch]);

  const handleAiEdit = useCallback(() => {
    if (aiReferenceImage) {
      openGenerate(aiReferenceImage.src, aiReferenceImage.shapeId);
    }
  }, [aiReferenceImage, openGenerate]);

  return (
    <>
      {aiToolbarPos && (
        <AiToolbar
          editor={editor}
          position={aiToolbarPos}
          onAiEdit={handleAiEdit}
        />
      )}
      {animPickerPos && animPickerShapeId && (
        <AnimationPicker
          editor={editor}
          position={animPickerPos}
          shapeId={animPickerShapeId}
          currentAnimation={animPickerCurrent}
        />
      )}
      <ProcessingOverlay editor={editor} />
      <ShapeAnimations editor={editor} />
      <EntranceAnimations editor={editor} />
      <PresentationMode editor={editor} />
      <DepthParallax editor={editor} />
      <ShapeIdTagger editor={editor} />
    </>
  );
}

// ─── Main canvas component ───────────────────────────────────────────
interface TldrawCanvasProps {
  boardId: string;
}

export default function TldrawCanvas({ boardId }: TldrawCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const suppressSave = useRef(false);

  const [showGenerate, setShowGenerate] = useState(false);
  const [generateRef, setGenerateRef] = useState<{
    src?: string;
    shapeId?: string;
  } | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  // Load snapshot from server on mount; save on document changes (debounced 2s)
  useEffect(() => {
    if (!editor) return;

    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      try {
        const res = await fetch(`/api/boards/${boardId}/snapshot`);
        if (res.ok) {
          const snapshot = await res.json();
          if (snapshot) {
            suppressSave.current = true;
            editor.store.loadStoreSnapshot(snapshot);
            suppressSave.current = false;
          }
        }
      } catch {
        // No snapshot or network error — tldraw uses IndexedDB fallback via persistenceKey
      }
    })();

    const unsub = editor.store.listen(
      () => {
        if (suppressSave.current) return;
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
          try {
            const snapshot = editor.store.getStoreSnapshot();
            await fetch(`/api/boards/${boardId}/snapshot`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(snapshot),
            });
          } catch {
            // Silently ignore save errors
          }
        }, 2000);
      },
      { scope: "document" }
    );

    return () => {
      unsub();
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, [editor, boardId]);

  const openGenerate = useCallback(
    (referenceImageSrc?: string, referenceShapeId?: string) => {
      setGenerateRef(
        referenceImageSrc ? { src: referenceImageSrc, shapeId: referenceShapeId } : null
      );
      setShowGenerate(true);
    },
    []
  );

  const openSearch = useCallback(() => {
    setShowSearch(true);
  }, []);

  const handleMount = useCallback((e: Editor) => {
    setEditor(e);

    // Auto-compress large pasted/dropped images
    e.registerExternalAssetHandler("file", async ({ file }) => {
      const MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB threshold
      const MAX_DIMENSION = 2048;

      let src: string;
      let w: number;
      let h: number;

      if (file.type.startsWith("image/") && file.size > MAX_SIZE_BYTES) {
        // Compress: load into canvas, resize, export as JPEG
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
        w = Math.round(bitmap.width * scale);
        h = Math.round(bitmap.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(bitmap, 0, 0, w, h);
        bitmap.close();

        src = canvas.toDataURL("image/jpeg", 0.85);
      } else if (file.type.startsWith("image/")) {
        // Small image: just read as data URL without compressing
        const bitmap = await createImageBitmap(file);
        w = bitmap.width;
        h = bitmap.height;
        bitmap.close();
        src = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } else {
        // Not an image (video, etc.) — pass through
        src = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        w = 300;
        h = 300;
      }

      const { AssetRecordType } = await import("@tldraw/tldraw");
      const assetId = AssetRecordType.createId();

      return {
        id: assetId,
        type: "image" as const,
        typeName: "asset" as const,
        props: {
          name: file.name || "image.png",
          src,
          w,
          h,
          mimeType: file.type || "image/png",
          isAnimated: false,
        },
        meta: {},
      };
    });

    // Override paste/drop placement — center images in the current viewport
    e.registerExternalContentHandler("files", async ({ files, point }) => {
      const { AssetRecordType, createShapeId: makeId } = await import("@tldraw/tldraw");
      const vp = e.getViewportPageBounds();
      // Place at the given point (drop target) or viewport center (paste)
      const cx = point?.x ?? vp.x + vp.w / 2;
      const cy = point?.y ?? vp.y + vp.h / 2;

      let offsetY = 0;
      for (const file of files) {
        if (!file.type.startsWith("image/")) continue;

        // Get asset through the registered asset handler
        const asset = await e.getAssetForExternalContent({ type: "file", file });
        if (!asset) continue;

        e.createAssets([asset]);

        const aw = (asset.props as any).w || 512;
        const ah = (asset.props as any).h || 512;
        // Scale down for display — max 600px on screen
        const maxDisplay = 600;
        const scale = Math.min(1, maxDisplay / Math.max(aw, ah));
        const displayW = Math.round(aw * scale);
        const displayH = Math.round(ah * scale);

        e.createShapes([{
          id: makeId(),
          type: "image",
          x: cx - displayW / 2,
          y: cy - displayH / 2 + offsetY,
          props: { assetId: asset.id, w: displayW, h: displayH },
        }]);

        offsetY += displayH + 20; // Stack multiple pastes vertically
      }
    });
  }, []);

  const tldrawComponents: TLComponents = {
    // Hide default toolbar (we use ToolRail)
    Toolbar: null,
    // Hide navigation panel (we use ZoomControls)
    NavigationPanel: null,
    // Hide main menu (hamburger)
    MainMenu: null,
    // Hide help menu
    HelpMenu: null,
    // Custom context menu with AI options
    ContextMenu: AIContextMenu,
  };

  return (
    <CanvasPanelContext.Provider value={{ openGenerate, openSearch }}>
      <div
        className="tldraw-canvas-wrapper"
        style={{
          position: "absolute",
          inset: 0,
        }}
      >
        <Tldraw
          persistenceKey={`board-${boardId}`}
          components={tldrawComponents}
          autoFocus
        >
          <CanvasUI onMount={handleMount} />
        </Tldraw>

        {/* Custom overlays outside tldraw */}
        <ToolRail editor={editor} />
        <ZoomControls editor={editor} />
      </div>

      {/* Panels */}
      {showGenerate && (
        <GeneratePanel
          editor={editor}
          onClose={() => {
            setShowGenerate(false);
            setGenerateRef(null);
          }}
          referenceImageSrc={generateRef?.src}
          referenceShapeId={generateRef?.shapeId}
          mode={generateRef?.src ? "edit" : "generate"}
        />
      )}

      {showSearch && (
        <SearchPanel
          editor={editor}
          onClose={() => setShowSearch(false)}
        />
      )}
    </CanvasPanelContext.Provider>
  );
}

// ─── Auto-Parallax Depth ──────────────────────────────────────────────
function DepthParallax({ editor }: { editor: Editor }) {
  useEffect(() => {
    let ticking = false;
    const applyParallax = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const camera = editor.getCamera();
        const shapes = editor.getCurrentPageShapeIds();

        shapes.forEach((id: any) => {
          const shape = editor.getShape(id);
          if (!shape) return;

          if (shape.type !== "image" && shape.type !== "text") return;

          const el = document.querySelector(`[data-shape-id="${id}"]`) as HTMLElement;
          if (!el) return;

          const bounds = editor.getShapePageBounds(id);
          if (!bounds) return;

          // Factor represents z-depth: closer objects move more.
          // Images have slight parallax; thick highlight headers do too.
          const sizeFactor = Math.min((bounds.w * bounds.h) / 500000, 0.15);
          const isBlackText = shape.type === "text" && (shape.props as any).color === "black";
          const depth = isBlackText ? -0.05 : sizeFactor;

          const px = -(camera.x * depth);
          const py = -(camera.y * depth);

          // Apply hardware accelerated transform on top of whatever Tldraw is doing
          el.style.transform = `translate3d(${px}px, ${py}px, 0)`;
        });
        ticking = false;
      });
    };

    const unsub = editor.store.listen(applyParallax, { scope: "session" });
    return () => unsub();
  }, [editor]);

  return null;
}

// ─── Viewport Entrance Animations ─────────────────────────────────────
function EntranceAnimations({ editor }: { editor: Editor }) {
  const seenShapes = useRef<Set<string>>(new Set());

  useEffect(() => {
    let ticking = false;
    const checkViewport = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const vp = editor.getViewportPageBounds();
        const shapes = editor.getCurrentPageShapeIds();

        shapes.forEach((id: any) => {
          if (seenShapes.current.has(id)) return; // Already animated in

          const bounds = editor.getShapePageBounds(id);
          if (!bounds) return;

          // If bounds intersect viewport
          if (
            bounds.maxX > vp.minX &&
            bounds.minX < vp.maxX &&
            bounds.maxY > vp.minY &&
            bounds.minY < vp.maxY
          ) {
            seenShapes.current.add(id);
            const el = document.querySelector(`[data-shape-id="${id}"]`) as HTMLElement;
            if (el) {
              el.style.animation = "entranceScale 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards";
            }
          }
        });
        ticking = false;
      });
    };

    const unsub = editor.store.listen(checkViewport, { scope: "session" });
    return () => unsub();
  }, [editor]);

  return null;
}

// ─── Shape ID Tagger ──────────────────────────────────────────────────
// tldraw v2 does NOT add data-shape-id to shape DOM elements.
// This component tags them so animations/parallax can querySelector
// by shape ID.
function ShapeIdTagger({ editor }: { editor: Editor }) {
  useEffect(() => {
    const tagShapes = () => {
      const shapes = editor.getCurrentPageShapes();
      // Each tldraw shape container is a .tl-shape div positioned via transform matrix.
      // We match them by comparing the transform the editor computes.
      for (const shape of shapes) {
        // Check if already tagged
        const existing = document.querySelector(`[data-shape-id="${shape.id}"]`);
        if (existing) continue;

        // Get the transform matrix tldraw uses for this shape
        const pageTransform = editor.getShapePageTransform(shape.id);
        if (!pageTransform) continue;

        // tldraw sets the CSS transform to this matrix
        const a = pageTransform.a.toFixed(4);
        const b = pageTransform.b.toFixed(4);
        const c = pageTransform.c.toFixed(4);
        const d = pageTransform.d.toFixed(4);
        const e = pageTransform.e.toFixed(4);
        const f = pageTransform.f.toFixed(4);
        const cssTransform = `matrix(${a}, ${b}, ${c}, ${d}, ${e}, ${f})`;

        // Find the matching .tl-shape element
        const allShapeEls = Array.from(document.querySelectorAll('.tl-shape:not(.tl-shape-background)'));
        for (const el of allShapeEls) {
          if ((el as HTMLElement).dataset.shapeId) continue; // already tagged
          const elTransform = (el as HTMLElement).style.transform;
          if (elTransform === cssTransform) {
            (el as HTMLElement).dataset.shapeId = shape.id;
            break;
          }
        }
      }
    };

    tagShapes();
    const unsub = editor.store.listen(tagShapes, { scope: "document" });
    // Also re-tag on camera movements since DOM refreshes
    const unsub2 = editor.store.listen(tagShapes, { scope: "session" });
    return () => { unsub(); unsub2(); };
  }, [editor]);

  return null;
}
