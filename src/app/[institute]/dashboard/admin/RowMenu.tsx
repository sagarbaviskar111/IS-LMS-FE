"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./rowMenu.module.css";

export interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  hidden?: boolean;
  disabled?: boolean;
}

const MENU_WIDTH = 200;

// A "⋯" button that opens a small menu of the less-used row actions.
// The menu is drawn in a portal so a scrolling table never clips it.
export default function RowMenu({ items, label = "More actions" }: { items: MenuItem[]; label?: string }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const visible = items.filter((i) => !i.hidden);

  const close = () => setPos(null);

  useEffect(() => {
    if (!pos) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if ((t as HTMLElement).closest?.("[data-rowmenu]")) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  const toggle = () => {
    if (pos) return close();
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.max(8, Math.min(r.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    const needed = visible.length * 38 + 16;
    // Open upwards when there isn't room below.
    if (window.innerHeight - r.bottom < needed && r.top > needed) setPos({ bottom: window.innerHeight - r.top + 4, left });
    else setPos({ top: r.bottom + 4, left });
  };

  if (visible.length === 0) return null;

  return (
    <>
      <button ref={btnRef} type="button" className={styles.trigger} onClick={toggle} aria-label={label} aria-haspopup="menu" aria-expanded={!!pos} title={label}>
        ⋯
      </button>
      {pos &&
        createPortal(
          <div data-rowmenu className={styles.menu} role="menu" style={{ top: pos.top, bottom: pos.bottom, left: pos.left, width: MENU_WIDTH }}>
            {visible.map((item, i) => (
              <button
                key={`${item.label}-${i}`}
                type="button"
                role="menuitem"
                className={`${styles.item} ${item.danger ? styles.danger : ""}`}
                disabled={item.disabled}
                onClick={() => {
                  close();
                  item.onClick();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
