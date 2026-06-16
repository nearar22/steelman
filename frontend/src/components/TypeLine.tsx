'use client';

import { useEffect, useState } from 'react';

interface TypeLineProps {
  text: string;
  speed?: number;
  startDelay?: number;
  showCaret?: boolean;
  onDone?: () => void;
}

/**
 * Types a line out character by character under the lamp, the way an
 * interrogation transcript is dictated. Honors prefers-reduced-motion by
 * rendering the whole line immediately.
 */
export default function TypeLine({
  text,
  speed = 16,
  startDelay = 0,
  showCaret = true,
  onDone,
}: TypeLineProps) {
  const [shown, setShown] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      setShown(text);
      setDone(true);
      onDone?.();
      return;
    }

    let i = 0;
    setShown('');
    setDone(false);
    let interval: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        i += 1;
        setShown(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
          onDone?.();
        }
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, startDelay]);

  return (
    <>
      {shown}
      {showCaret && !done && <span className="caret" aria-hidden />}
    </>
  );
}
