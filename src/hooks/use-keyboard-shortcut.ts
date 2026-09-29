import { useEffect, useRef } from "react";

export function useKeyboardShortcut(key: string, onPress: () => void) {
  const onPressRef = useRef(onPress);

  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== key) return;
      event.preventDefault();
      onPressRef.current();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key]);
}
