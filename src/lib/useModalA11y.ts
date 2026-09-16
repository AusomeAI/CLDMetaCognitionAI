import { useEffect, useRef } from 'react';

/**
 * Closes the modal on Escape and moves focus to the close button on open,
 * restoring focus to whatever triggered the modal when it unmounts.
 */
export function useModalA11y(onClose: () => void) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    triggerElementRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      triggerElementRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return closeButtonRef;
}
