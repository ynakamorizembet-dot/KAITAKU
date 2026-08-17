"use client";

import { useEffect, useState } from "react";

export default function CountUp({
  value,
  duration = 800,
}: {
  value: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let frame: number;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{display}</>;
}
