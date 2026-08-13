import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

/**
 * SwipeableFileRow — a file list row that can be dragged horizontally
 * to reveal a destructive delete action behind it.
 *
 * Uses pointer events for cross-device (mouse + touch) support.
 * Snaps open at a threshold, closed otherwise. Tapping the revealed
 * delete panel triggers onDelete.
 */
interface SwipeableFileRowProps {
  children: React.ReactNode;
  onDelete: () => void;
  /** Width of the revealed delete panel in px. */
  actionWidth?: number;
  /** Disable the swipe gesture (e.g. during selection mode). */
  disabled?: boolean;
}

const ACTION_WIDTH_DEFAULT = 88;
const OPEN_THRESHOLD = 40;

export function SwipeableFileRow({
  children,
  onDelete,
  actionWidth = ACTION_WIDTH_DEFAULT,
  disabled = false,
}: SwipeableFileRowProps) {
  const [dragX, setDragX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const startX = useRef<number | null>(null);
  const currentX = useRef(0);
  const dragging = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);

  const clampX = useCallback(
    (x: number) => Math.max(-actionWidth, Math.min(0, x)),
    [actionWidth],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      startX.current = e.clientX;
      currentX.current = 0;
      dragging.current = true;
      if (rowRef.current) rowRef.current.setPointerCapture(e.pointerId);
    },
    [disabled],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current || startX.current === null) return;
      const delta = e.clientX - startX.current;
      // Allow swiping left (negative) to reveal; allow right swipe to close
      const clamped = clampX(isOpen ? delta - actionWidth : delta);
      currentX.current = clamped;
      setDragX(clamped);
    },
    [clampX, isOpen],
  );

  const finishDrag = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    startX.current = null;
    // Snap based on how far it was dragged
    if (currentX.current <= -OPEN_THRESHOLD) {
      setDragX(-actionWidth);
      setIsOpen(true);
    } else {
      setDragX(0);
      setIsOpen(false);
    }
  }, [actionWidth]);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (rowRef.current?.hasPointerCapture(e.pointerId)) {
        rowRef.current?.releasePointerCapture(e.pointerId);
      }
      finishDrag();
    },
    [finishDrag],
  );

  const onPointerCancel = useCallback(() => finishDrag(), [finishDrag]);

  // Close when clicking elsewhere
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setDragX(0);
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isOpen]);

  return (
    <div className="relative overflow-hidden">
      {/* Delete action panel behind the row (hidden when disabled) */}
      {!disabled && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete file"
          className="absolute inset-y-0 right-0 flex w-[var(--swipe-action-width)] items-center justify-center bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90"
          style={{ ["--swipe-action-width" as string]: `${actionWidth}px` }}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      )}

      {/* Foreground row */}
      <div
        ref={rowRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className="relative touch-pan-y bg-card"
        style={{
          transform: disabled ? undefined : `translateX(${dragX}px)`,
          transition: dragging.current ? "none" : "transform 0.25s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
