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
const SHEET_MAX_WIDTH = 600;

type Pos = { top?: number; bottom?: number; left: number; maxHeight: number } | { sheet: true };

// A "⋯" button that opens a small menu of the less-used row actions.
// The menu is drawn in a portal so a scrolling table never clips it.
// On phones it opens as a bottom sheet; elsewhere as a popover kept on-screen.
export default function RowMenu({ items, label = "More actions" }: { items: MenuItem[]; label?: string }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const visible = items.filter((i) => !i.hidden);
  const isSheet = !!pos && "sheet" in pos;

  const close = () => setPos(null);

  useEffect(() => {
    if (!pos) return;
    const onDown = (e: Event) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if ((t as HTMLElement).closest?.("[data-rowmenu]")) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    // Scrolling inside the sheet itself must not dismiss it.
    const onScroll = (e: Event) => {
      if ((e.target as HTMLElement | null)?.closest?.("[data-rowmenu]")) return;
      close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  const toggle = () => {
    if (pos) return close();
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    if (window.innerWidth <= SHEET_MAX_WIDTH) return setPos({ sheet: true });
    const left = Math.max(8, Math.min(r.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    const needed = visible.length * 38 + 16;
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    // Open upwards when there isn't room below (and there is more above).
    if (below < needed && above > below) setPos({ bottom: window.innerHeight - r.top + 4, left, maxHeight: above });
    else setPos({ top: r.bottom + 4, left, maxHeight: below });
  };

  if (visible.length === 0) return null;

  return (
    <>
      <button ref={btnRef} type="button" className={styles.trigger} onClick={toggle} aria-label={label} aria-haspopup="menu" aria-expanded={!!pos} title={label}>
        ⋯
      </button>
      {pos &&
        createPortal(
          <>
            {isSheet && <div className={styles.backdrop} onClick={close} aria-hidden="true" />}
            <div
              data-rowmenu
              className={`${styles.menu} ${isSheet ? styles.sheet : ""}`}
              role="menu"
              style={
                "sheet" in pos
                  ? undefined
                  : { top: pos.top, bottom: pos.bottom, left: pos.left, width: MENU_WIDTH, maxHeight: pos.maxHeight, overflowY: "auto" }
              }
            >
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
            </div>
          </>,
          document.body
        )}
    </>
  );
}
