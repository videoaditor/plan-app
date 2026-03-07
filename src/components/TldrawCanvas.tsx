"use client";

import {
  Tldraw,
  useEditor,
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
  Copy,
  Clipboard,
  Trash2,
  Layers,
  Wand2,
  Search,
  Plus,
} from "lucide-react";

import ToolRail from "./ToolRail";
import ZoomControls from "./ZoomControls";
import AiToolbar from "./AiToolbar";
import AnimationPicker, { getShapeAnimation, type AnimationType } from "./AnimationPicker";
import ProcessingOverlay from "./ProcessingOverlay";
import GeneratePanel from "./GeneratePanel";
import SearchPanel from "./SearchPanel";

// ─── Context for panel state ─────────────────────────────────────────
interface CanvasPanelState {
  openGenerate: (referenceImageSrc?: string, referenceShapeId?: string) => void;
  openSearch: () => void;
}

const CanvasPanelContext = createContext<CanvasPanelState>({
  openGenerate: () => {},
  openSearch: () => {},
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

  // Sync zoom level to CSS variable so canvas texture scales with camera
  useEffect(() => {
    const updateZoom = () => {
      const camera = editor.getCamera();
      const zoom = camera.z;
      document.documentElement.style.setProperty("--canvas-zoom", String(zoom));
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
    </>
  );
}

// ─── Main canvas component ───────────────────────────────────────────
interface TldrawCanvasProps {
  boardId: string;
}

export default function TldrawCanvas({ boardId }: TldrawCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null);

  const [showGenerate, setShowGenerate] = useState(false);
  const [generateRef, setGenerateRef] = useState<{
    src?: string;
    shapeId?: string;
  } | null>(null);
  const [showSearch, setShowSearch] = useState(false);

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
