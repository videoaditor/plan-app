"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { SwitchCamera } from "lucide-react";

// Draggable, mirrored webcam bubble. Snaps to the four corners, three sizes,
// device picker when several cameras exist. No audio — the screen recorder
// captures that. Position/size are pure UI prefs → localStorage. Renders as a
// DOM overlay above the canvas so it rides along in a tab recording.

const SIZES = { S: 128, M: 184, L: 256 } as const;
type SizeKey = keyof typeof SIZES;
type Corner = "tl" | "tr" | "bl" | "br";
const MARGIN = 20;
const SIZE_ORDER: SizeKey[] = ["S", "M", "L"];

function cornerPos(corner: Corner, size: number) {
  const maxX = window.innerWidth - size - MARGIN;
  const maxY = window.innerHeight - size - MARGIN;
  return {
    x: corner === "tl" || corner === "bl" ? MARGIN : maxX,
    y: corner === "tl" || corner === "tr" ? MARGIN : maxY,
  };
}

function nearestCorner(cx: number, cy: number): Corner {
  const h = cx < window.innerWidth / 2 ? "l" : "r";
  const v = cy < window.innerHeight / 2 ? "t" : "b";
  return (v + h) as Corner;
}

export default function FacecamBubble({ onError }: { onError: (msg: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [size, setSize] = useState<SizeKey>(
    () => (typeof window !== "undefined" && (localStorage.getItem("plan-facecam-size") as SizeKey)) || "M"
  );
  const [corner, setCorner] = useState<Corner>(
    () => (typeof window !== "undefined" && (localStorage.getItem("plan-facecam-corner") as Corner)) || "br"
  );
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(
    () => (typeof window !== "undefined" && localStorage.getItem("plan-facecam-device")) || undefined
  );
  const [hover, setHover] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const streamRef = useRef<MediaStream | null>(null);

  const diameter = SIZES[size];

  // Acquire the camera. Re-runs when the chosen device changes. Any failure
  // (denied, no camera, in use) bubbles up as a toast — never a crash.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera not available in this browser");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        const all = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) setDevices(all.filter((d) => d.kind === "videoinput"));
      } catch (err) {
        if (!cancelled) {
          const name = (err as Error)?.name;
          onError(
            name === "NotAllowedError"
              ? "Camera access denied"
              : name === "NotFoundError"
                ? "No camera found"
                : "Could not start the camera"
          );
        }
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [deviceId, onError]);

  const pos = drag ?? cornerPos(corner, diameter);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Ignore drags that start on the controls.
      if ((e.target as HTMLElement).closest("[data-facecam-control]")) return;
      const start = cornerPos(corner, diameter);
      const base = drag ?? start;
      dragOffset.current = { x: e.clientX - base.x, y: e.clientY - base.y };
      setDrag(base);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [corner, diameter, drag]
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setDrag({
      x: Math.max(0, Math.min(window.innerWidth - diameter, e.clientX - dragOffset.current.x)),
      y: Math.max(0, Math.min(window.innerHeight - diameter, e.clientY - dragOffset.current.y)),
    });
  }, [diameter]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!drag) return;
    const next = nearestCorner(drag.x + diameter / 2, drag.y + diameter / 2);
    setCorner(next);
    localStorage.setItem("plan-facecam-corner", next);
    setDrag(null);
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  }, [drag, diameter]);

  const cycleSize = () => {
    const next = SIZE_ORDER[(SIZE_ORDER.indexOf(size) + 1) % SIZE_ORDER.length];
    setSize(next);
    localStorage.setItem("plan-facecam-size", next);
  };

  const switchCamera = () => {
    if (devices.length < 2) return;
    const idx = devices.findIndex((d) => d.deviceId === deviceId);
    const next = devices[(idx + 1) % devices.length];
    setDeviceId(next.deviceId);
    localStorage.setItem("plan-facecam-device", next.deviceId);
  };

  return (
    <div
      data-facecam-bubble
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: diameter,
        height: diameter,
        borderRadius: "50%",
        overflow: "hidden",
        zIndex: 600,
        cursor: drag ? "grabbing" : "grab",
        background: "#000",
        border: "3px solid var(--surface)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.28)",
        touchAction: "none",
        userSelect: "none",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scaleX(-1)", // mirror, like a selfie cam
          pointerEvents: "none",
        }}
      />

      {/* Controls — appear on hover, bottom center */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 4,
          opacity: hover ? 1 : 0,
          transition: "opacity 150ms ease",
          pointerEvents: hover ? "auto" : "none",
        }}
      >
        <button
          data-facecam-control
          onClick={cycleSize}
          title="Change size"
          style={controlStyle}
        >
          {size}
        </button>
        {devices.length > 1 && (
          <button
            data-facecam-control
            onClick={switchCamera}
            title="Switch camera"
            style={{ ...controlStyle, width: 24, padding: 0 }}
          >
            <SwitchCamera size={13} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}

const controlStyle: React.CSSProperties = {
  height: 24,
  minWidth: 24,
  padding: "0 7px",
  borderRadius: 100,
  border: "none",
  background: "rgba(0,0,0,0.55)",
  color: "#fff",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backdropFilter: "blur(4px)",
};
