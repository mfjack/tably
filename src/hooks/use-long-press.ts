import {
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";

const MOVE_TOLERANCE_IN_PX = 10;
const VIBRATION_IN_MS = 30;

type PointerPosition = { x: number; y: number };

export function useLongPress(
  onLongPress: (() => void) | undefined,
  durationInMs: number,
) {
  const timeoutRef = useRef<number | null>(null);
  const startPositionRef = useRef<PointerPosition | null>(null);
  const hasTriggeredRef = useRef(false);

  const cancel = useCallback(() => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    startPositionRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  function shouldIgnoreClick() {
    const hasTriggered = hasTriggeredRef.current;
    hasTriggeredRef.current = false;
    return hasTriggered;
  }

  if (!onLongPress) return { handlers: {}, shouldIgnoreClick };

  return {
    shouldIgnoreClick,
    handlers: {
      onPointerDown: (event: PointerEvent) => {
        if (event.button !== 0) return;
        hasTriggeredRef.current = false;
        startPositionRef.current = { x: event.clientX, y: event.clientY };
        timeoutRef.current = window.setTimeout(() => {
          hasTriggeredRef.current = true;
          timeoutRef.current = null;
          navigator.vibrate?.(VIBRATION_IN_MS);
          onLongPress();
        }, durationInMs);
      },
      onPointerMove: (event: PointerEvent) => {
        const startPosition = startPositionRef.current;
        if (!startPosition) return;
        const distance = Math.hypot(
          event.clientX - startPosition.x,
          event.clientY - startPosition.y,
        );
        if (distance > MOVE_TOLERANCE_IN_PX) cancel();
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (event: MouseEvent) => event.preventDefault(),
    },
  };
}
