"use client";

import { useEffect, useRef } from "react";
import adminStyles from "./admin/admin.module.css";

const BUTTONS: { cmd: string; label: string; title: string; style?: React.CSSProperties }[] = [
  { cmd: "bold", label: "B", title: "Bold", style: { fontWeight: 700 } },
  { cmd: "italic", label: "I", title: "Italic", style: { fontStyle: "italic" } },
  { cmd: "underline", label: "U", title: "Underline", style: { textDecoration: "underline" } },
  { cmd: "insertUnorderedList", label: "• List", title: "Bullet list" },
  { cmd: "insertOrderedList", label: "1. List", title: "Numbered list" },
];

// Small rich-text box: bold / italic / underline and bullet or numbered lists.
// Emits HTML; the server sanitizes it again before saving.
export default function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Seed once; afterwards the DOM is the source of truth (re-setting innerHTML would reset the caret).
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = (cmd: string) => {
    ref.current?.focus();
    document.execCommand(cmd);
    onChange(ref.current?.innerHTML ?? "");
  };

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", gap: 6, padding: 6, borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
        {BUTTONS.map((b) => (
          <button
            key={b.cmd}
            type="button"
            title={b.title}
            className={adminStyles.smallButton}
            style={b.style}
            // mouseDown + preventDefault keeps the text selection while clicking the toolbar
            onMouseDown={(e) => {
              e.preventDefault();
              run(b.cmd);
            }}
          >
            {b.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        style={{ minHeight: 110, padding: 10, outline: "none", lineHeight: 1.5 }}
      />
    </div>
  );
}
