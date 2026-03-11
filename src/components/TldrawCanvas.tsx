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

  // Sync zoom level to CSS variable for background dot scaling
  useEffect(() => {
    const updateZoom = () => {
      const camera = editor.getCamera();
      document.documentElement.style.setProperty("--canvas-zoom", String(camera.z));
    };
    updateZoom();
    const unsub = editor.store.listen(updateZoom, { scope: "session" });
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


  // Keep tldraw focused — required for wheel/scroll/zoom/keyboard to work
  useEffect(() => {
    // Focus immediately and again after layout settles
    editor.focus();
    const t1 = setTimeout(() => editor.focus(), 50);
    const t2 = setTimeout(() => editor.focus(), 200);
    const t3 = setTimeout(() => editor.focus(), 500);

    // Watch for container resize/reposition (sidebar toggle, window resize)
    const container = document.querySelector(".tl-container");
    let resizeObserver: ResizeObserver | null = null;
    if (container) {
      resizeObserver = new ResizeObserver(() => {
        const rect = container.getBoundingClientRect();
        const current = editor.getViewportScreenBounds();
        const Box = current.constructor as any;
        if (Math.abs(current.x - rect.x) > 1 || Math.abs(current.y - rect.y) > 1 ||
            Math.abs(current.w - rect.width) > 1 || Math.abs(current.h - rect.height) > 1) {
          editor.updateViewportScreenBounds(new Box(rect.x, rect.y, rect.width, rect.height));
        }
      });
      resizeObserver.observe(container);
    }

    // Re-focus on any pointer interaction with the canvas
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".tl-canvas") || target.closest(".tldraw-canvas-wrapper")) {
        requestAnimationFrame(() => {
          if (!editor.getInstanceState().isFocused) {
            editor.focus();
          }
        });
      }
    };

    // Re-focus on wheel BEFORE tldraw tries to process it
    // This uses capture phase so we focus first, then tldraw gets the event
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".tl-canvas") || target.closest(".tldraw-canvas-wrapper")) {
        if (!editor.getInstanceState().isFocused) {
          editor.focus();
          // Re-dispatch the wheel event after focusing so tldraw picks it up
          requestAnimationFrame(() => {
            const clone = new WheelEvent("wheel", {
              deltaX: e.deltaX,
              deltaY: e.deltaY,
              deltaMode: e.deltaMode,
              clientX: e.clientX,
              clientY: e.clientY,
              ctrlKey: e.ctrlKey,
              shiftKey: e.shiftKey,
              altKey: e.altKey,
              metaKey: e.metaKey,
              bubbles: true,
              cancelable: true,
            });
            (e.target as HTMLElement).dispatchEvent(clone);
          });
        }
      }
    };

    // Re-focus when document focus returns to body (e.g. after clicking overlays)
    const handleFocusIn = () => {
      if (document.activeElement === document.body) {
        editor.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, { capture: true });
    document.addEventListener("wheel", handleWheel, { capture: true });
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      resizeObserver?.disconnect();
      document.removeEventListener("pointerdown", handlePointerDown, { capture: true } as any);
      document.removeEventListener("wheel", handleWheel, { capture: true } as any);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [editor]);

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
      {/* ShapeAnimations removed — CSS transform conflicts with tldraw */}
      <PresentationMode editor={editor} />
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

            // CRITICAL: loadStoreSnapshot overwrites screenBounds from stored data
            // which won't match the current container position. Fix it immediately.
            const fixScreenBounds = () => {
              const container = document.querySelector(".tl-container");
              if (!container) return;
              const rect = container.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                const current = editor.getViewportScreenBounds();
                const BoxCls = current.constructor as any;
                editor.updateViewportScreenBounds(new BoxCls(rect.x, rect.y, rect.width, rect.height));
              }
            };
            fixScreenBounds();
            requestAnimationFrame(fixScreenBounds);
            setTimeout(fixScreenBounds, 50);
            setTimeout(fixScreenBounds, 200);
            setTimeout(fixScreenBounds, 500);

            // Re-focus after snapshot load
            requestAnimationFrame(() => editor.focus());
            setTimeout(() => editor.focus(), 100);
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
    // Expose editor for programmatic access
    (window as any).__tldrawEditor = e;
    setEditor(e);
    
    // Ensure focus on mount
    e.focus();
    setTimeout(() => e.focus(), 300);
    setTimeout(() => e.focus(), 800);

    // Fix viewport screen bounds — tldraw can miscalculate container offset
    // when sidebar/topbar are present during mount
    const fixBounds = () => {
      const container = document.querySelector(".tl-container");
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const current = e.getViewportScreenBounds();
      const Box = current.constructor as any;
      const correctBounds = new Box(rect.x, rect.y, rect.width, rect.height);
      if (current.x !== rect.x || current.y !== rect.y || 
          current.w !== rect.width || current.h !== rect.height) {
        e.updateViewportScreenBounds(correctBounds);
      }
    };
    // Run after layout settles at various timings
    requestAnimationFrame(fixBounds);
    setTimeout(fixBounds, 100);
    setTimeout(fixBounds, 500);
    setTimeout(fixBounds, 1000);

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

        {/* Custom overlays outside tldraw — prevent focus steal */}
        <div onMouseDown={(e) => { e.preventDefault(); }}>
          <ToolRail editor={editor} />
          <ZoomControls editor={editor} />
        </div>
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
