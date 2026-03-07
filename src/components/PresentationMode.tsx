"use client";

import { useEffect, useState, useCallback } from "react";
import type { Editor, TLShapeId } from "@tldraw/tldraw";
import { Play, X, ChevronRight, ChevronLeft } from "lucide-react";

export default function PresentationMode({ editor }: { editor: Editor }) {
    const [isPresenting, setIsPresenting] = useState(false);
    const [markers, setMarkers] = useState<{ id: TLShapeId; num: number; bounds: any }[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);

    // Find markers (text shapes starting with #1, #2, etc)
    const refreshMarkers = useCallback(() => {
        const shapes = editor.getCurrentPageShapes();
        const found = shapes
            .filter((s) => s.type === "text" && /^#\d+/.test((s.props as any).text || ""))
            .map((s) => {
                const text = (s.props as any).text as string;
                const numMatch = text.match(/^#(\d+)/);
                const num = numMatch ? parseInt(numMatch[1], 10) : 999;
                return {
                    id: s.id,
                    num,
                    bounds: editor.getShapePageBounds(s.id)!,
                };
            })
            .filter((m) => m.bounds)
            .sort((a, b) => a.num - b.num);
        setMarkers(found);
        return found;
    }, [editor]);

    const goToMarker = useCallback(
        (index: number, mks: any[]) => {
            if (mks.length === 0) return;
            const safeIndex = Math.max(0, Math.min(index, mks.length - 1));
            setCurrentIndex(safeIndex);
            const marker = mks[safeIndex];

            editor.centerOnPoint(
                { x: marker.bounds.midX, y: marker.bounds.midY },
                { animation: { duration: 1200 } }
            );
        },
        [editor]
    );

    // Handle keyboard navigation
    useEffect(() => {
        if (!isPresenting) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't intercept if they are typing in an input
            if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;

            if (e.key === "Escape") {
                setIsPresenting(false);
            } else if (e.key === " " || e.key === "ArrowRight") {
                e.preventDefault();
                goToMarker(currentIndex + 1, markers);
            } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                goToMarker(currentIndex - 1, markers);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isPresenting, currentIndex, markers, goToMarker]);

    // Handle parallax effect when presenting
    useEffect(() => {
        if (!isPresenting) {
            document.body.classList.remove("is-presenting");
            return;
        }
        document.body.classList.add("is-presenting");

        const handleMouseMove = (e: MouseEvent) => {
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            const dx = (e.clientX - cx) * 0.03;
            const dy = (e.clientY - cy) * 0.03;

            const wrapper = document.querySelector(".tldraw-canvas-wrapper") as HTMLElement;
            if (wrapper) {
                wrapper.style.transform = `translate(${-dx}px, ${-dy}px) scale(1.02)`;
                wrapper.style.transition = "transform 0.1s ease-out";
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            const wrapper = document.querySelector(".tldraw-canvas-wrapper") as HTMLElement;
            if (wrapper) {
                wrapper.style.transform = "none";
                wrapper.style.transition = "none";
            }
            document.body.classList.remove("is-presenting");
        };
    }, [isPresenting]);

    if (!isPresenting) {
        return (
            <div style={{ position: "fixed", bottom: 24, left: 24, zIndex: 500 }}>
                <button
                    onClick={() => {
                        const mks = refreshMarkers();
                        setIsPresenting(true);
                        if (mks.length > 0) goToMarker(0, mks);
                    }}
                    title="Start Presentation (Finds text like #1, #2)"
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 16px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: 100,
                        color: "var(--text-primary)",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                >
                    <Play size={16} fill="currentColor" />
                    Present
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="presentation-vignette" />
            <div className="presentation-controls">
                <div className="marker-progress">
                    {markers.length > 0
                        ? `Scene ${currentIndex + 1} / ${markers.length}`
                        : "No markers found (add text like #1)"}
                </div>
                <button
                    onClick={() => goToMarker(currentIndex - 1, markers)}
                    disabled={currentIndex <= 0}
                    title="Previous (Left Arrow)"
                >
                    <ChevronLeft size={20} />
                </button>
                <button
                    onClick={() => goToMarker(currentIndex + 1, markers)}
                    disabled={currentIndex >= markers.length - 1}
                    title="Next (Space / Right Arrow)"
                >
                    <ChevronRight size={20} />
                </button>
                <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 4px" }} />
                <button onClick={() => setIsPresenting(false)} className="exit-btn" title="Exit (Esc)">
                    <X size={20} />
                </button>
            </div>
        </>
    );
}
