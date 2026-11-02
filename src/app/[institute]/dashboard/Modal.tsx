"use client";

import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./dashboard.module.css";

export default function Modal({
  children,
  onClose,
  dialogStyle,
}: {
  children: ReactNode;
  onClose: () => void;
  dialogStyle?: CSSProperties;
}) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Parents often pass an inline onClose; keep the latest in a ref so the
  // listeners/focus handling below are set up once, not on every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    setMounted(true);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const opener = document.activeElement as HTMLElement | null;

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, []);

  // Once the dialog is in the DOM, put focus inside it (unless a field
  // already grabbed it via autoFocus).
  useEffect(() => {
    const el = dialogRef.current;
    if (mounted && el && !el.contains(document.activeElement)) el.focus({ preventScroll: true });
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.modalDialog}
        style={dialogStyle}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
