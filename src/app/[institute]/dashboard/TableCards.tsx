"use client";

import { useEffect } from "react";

// On phones the dashboard's smaller tables turn into labelled cards (see the
// `[data-cards]` rules in admin.module.css). The labels come from each table's own
// header row, so no page has to be changed. Wide tables (many columns, merged cells)
// are left alone and keep scrolling sideways.
const MAX_COLUMNS = 7;

function label(table: HTMLTableElement) {
  const head = table.tHead?.rows[0];
  if (!head) return;
  const headers = Array.from(head.cells).map((th) => (th.textContent || "").trim());
  const wide = headers.length > MAX_COLUMNS || !!table.querySelector("td[colspan], th[colspan]");
  if (wide) return;
  table.setAttribute("data-cards", "");
  for (const body of Array.from(table.tBodies)) {
    for (const row of Array.from(body.rows)) {
      Array.from(row.cells).forEach((cell, i) => {
        const text = headers[i] || "";
        if (cell.getAttribute("data-label") !== text) cell.setAttribute("data-label", text);
      });
    }
  }
}

export default function TableCards() {
  useEffect(() => {
    let frame = 0;
    const run = () => {
      frame = 0;
      document.querySelectorAll<HTMLTableElement>("main table").forEach(label);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(run);
    };
    run();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
