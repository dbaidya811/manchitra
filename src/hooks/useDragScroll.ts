import { useRef, useEffect } from 'react';

interface DragScrollOptions {
  direction?: 'vertical' | 'horizontal' | 'both';
  speed?: number;
}

export function useDragScroll<T extends HTMLElement = HTMLDivElement>(
  options: DragScrollOptions = { direction: 'vertical', speed: 1 }
) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialScrollTop = 0;
    let initialScrollLeft = 0;
    const speed = options.speed ?? 1;

    const onMouseDown = (e: MouseEvent) => {
      // Only main left mouse button
      if (e.button !== 0) return;

      // Do not hijack touch-synthesized mouse events on mobile
      if ((e as any).sourceCapabilities?.firesTouchEvents) return;

      const target = e.target as HTMLElement;
      // Do not drag when interacting with inputs, buttons or interactive controls
      if (target.closest('input, textarea, select, button, a, [role="button"]')) return;

      isDown = true;
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      initialScrollTop = el.scrollTop;
      initialScrollLeft = el.scrollLeft;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;

      const deltaX = (e.clientX - startX) * speed;
      const deltaY = (e.clientY - startY) * speed;

      // Threshold of 4px before treating as drag gesture
      if (!isDragging && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
        isDragging = true;
        el.style.cursor = 'grab';
        document.body.style.userSelect = 'none';
      }

      if (isDragging) {
        if (options.direction === 'horizontal' || options.direction === 'both') {
          el.scrollLeft = initialScrollLeft - deltaX;
        }
        if (options.direction === 'vertical' || options.direction === 'both') {
          el.scrollTop = initialScrollTop - deltaY;
        }
      }
    };

    const onMouseUp = () => {
      if (isDown) {
        isDown = false;
        el.style.cursor = '';
        document.body.style.removeProperty('user-select');
        // Keep isDragging true for a microtick so onClickCapture can intercept click
        setTimeout(() => {
          isDragging = false;
        }, 50);
      }
    };

    // Capture and stop click events if a drag took place
    const onClickCapture = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('click', onClickCapture, true);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('click', onClickCapture, true);
    };
  }, [options.direction, options.speed]);

  return ref;
}
