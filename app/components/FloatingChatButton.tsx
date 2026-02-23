"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Position = { x: number; y: number };

const STORAGE_KEY = "floatingChatPosition";
const DRAG_THRESHOLD = 6;

export default function FloatingChatButton() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 20, y: 100 });
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const startPointerRef = useRef<Position>({ x: 0, y: 0 });
  const dragOffsetRef = useRef<Position>({ x: 0, y: 0 });

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    setIsLoggedIn(Boolean(token));

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Position;
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPosition(parsed);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    } else {
      setPosition({
        x: Math.max(0, window.innerWidth - 80),
        y: Math.max(0, window.innerHeight - 140),
      });
    }
  }, []);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!draggingRef.current) return;

      if (!movedRef.current) {
        const distance = Math.hypot(
          e.clientX - startPointerRef.current.x,
          e.clientY - startPointerRef.current.y
        );
        if (distance >= DRAG_THRESHOLD) {
          movedRef.current = true;
        }
      }

      const maxX = Math.max(0, window.innerWidth - 64);
      const maxY = Math.max(0, window.innerHeight - 64);

      const x = Math.min(Math.max(0, e.clientX - dragOffsetRef.current.x), maxX);
      const y = Math.min(Math.max(0, e.clientY - dragOffsetRef.current.y), maxY);

      setPosition({ x, y });
    }

    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      if (movedRef.current) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [position]);

  if (!isLoggedIn || pathname === "/chat") {
    return null;
  }

  return (
    <div
      style={{ left: position.x, top: position.y }}
      className="fixed z-50"
      onPointerDown={(e) => {
        const elementRect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        draggingRef.current = true;
        movedRef.current = false;
        startPointerRef.current = { x: e.clientX, y: e.clientY };
        dragOffsetRef.current = {
          x: e.clientX - elementRect.left,
          y: e.clientY - elementRect.top,
        };
      }}
    >
      <Link
        href="/chat"
        className="h-14 w-14 rounded-full bg-blue-700 hover:bg-blue-800 text-white shadow-lg flex items-center justify-center text-2xl"
        onClick={(e) => {
          if (movedRef.current) {
            e.preventDefault();
          }
        }}
      >
        💬
      </Link>
    </div>
  );
}
