"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";

export interface WheelTask {
  id: string;
  title: string;
  done: number;
  total: number;
}

const COVERS = [
  "linear-gradient(150deg, rgb(238 197 138), rgb(232 150 162))",
  "linear-gradient(150deg, rgb(150 199 170), rgb(124 206 224))",
  "linear-gradient(150deg, rgb(139 146 238), rgb(124 206 224))",
  "linear-gradient(150deg, rgb(232 150 162), rgb(139 146 238))",
  "linear-gradient(150deg, rgb(124 206 224), rgb(150 199 170))",
];

const SPACING = 138; // px between adjacent cards

/**
 * A premium card "wheel" for switching tasks — adapted from the Creative
 * Reference Library carousel. The focused task sits centered and upright; the
 * others tilt away on an arc. Drag / swipe to rotate; tap a side card to focus
 * it. Calls onSelect(id) when the centered task changes.
 */
export default function TaskWheel({
  tasks,
  activeId,
  onSelect,
}: {
  tasks: WheelTask[];
  activeId?: string;
  onSelect: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  const found = tasks.findIndex((t) => t.id === activeId);
  const idx = found < 0 ? 0 : found;
  const [drag, setDrag] = useState(0); // for re-render; logic reads dragRef
  const dragRef = useRef(0);
  const startX = useRef<number | null>(null);
  const moved = useRef(false);

  function down(e: React.PointerEvent) {
    startX.current = e.clientX;
    dragRef.current = 0;
    moved.current = false;
    try {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    } catch {}
  }
  function move(e: React.PointerEvent) {
    if (startX.current == null) return;
    const d = e.clientX - startX.current;
    if (Math.abs(d) > 4) moved.current = true;
    dragRef.current = d;
    setDrag(d);
  }
  function up() {
    if (startX.current == null) return;
    const steps = -dragRef.current / SPACING;
    let ni = Math.round(idx + steps);
    ni = Math.max(0, Math.min(tasks.length - 1, ni));
    startX.current = null;
    dragRef.current = 0;
    setDrag(0);
    if (tasks[ni] && tasks[ni].id !== activeId) onSelect(tasks[ni].id);
  }

  // current (possibly fractional) center while dragging
  const center = idx - drag / SPACING;

  return (
    <div
      className="relative h-[244px] w-full touch-pan-y select-none overflow-hidden"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      style={{ cursor: "grab" }}
    >
      {tasks.map((t, i) => {
        const o = i - center; // offset from center
        const ao = Math.abs(o);
        if (ao > 2.6) return null;
        const x = o * SPACING;
        const rot = Math.max(-22, Math.min(22, -o * 13));
        const scale = Math.max(0.56, 1 - ao * 0.17);
        const y = ao * ao * 14;
        const opacity = Math.max(0, 1 - ao * 0.34);
        const blur = Math.min(3.5, ao * 1.4);
        const z = 100 - Math.round(ao * 10);
        const center0 = ao < 0.5;
        return (
          <motion.button
            key={t.id}
            onClick={() => {
              if (!moved.current && t.id !== activeId) onSelect(t.id);
            }}
            className="absolute left-1/2 top-1/2"
            style={{ zIndex: z }}
            animate={{
              x: x - 75,
              y: y - 98,
              rotate: rot,
              scale,
              opacity,
              filter: `blur(${blur}px)`,
            }}
            transition={
              reduce || startX.current != null
                ? { duration: 0 }
                : { type: "spring", stiffness: 260, damping: 30 }
            }
          >
            {/* polaroid */}
            <div className="w-[150px] rounded-[14px] bg-[rgb(244,244,247)] p-2.5 pb-3 shadow-[0_22px_50px_-18px_rgba(0,0,0,0.8)]">
              <div
                className="flex h-[150px] w-full items-end rounded-[7px] p-2.5"
                style={{ background: COVERS[i % COVERS.length] }}
              >
                <span className="numeric text-[11px] font-semibold text-black/55">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <p
                className={`mt-2 line-clamp-1 px-0.5 text-[12px] font-medium text-neutral-800 ${
                  center0 ? "" : "opacity-80"
                }`}
              >
                {t.title}
              </p>
              <p className="numeric px-0.5 text-[10px] text-neutral-500">
                {t.done}/{t.total} 🍅
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
