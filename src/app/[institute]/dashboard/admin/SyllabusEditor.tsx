"use client";

import { useRef, useState } from "react";
import type { SyllabusItem } from "@/lib/api";
import styles from "./admin.module.css";

interface TopicDraft {
  key: number;
  id?: string;
  title: string;
}
interface UnitDraft {
  key: number;
  name: string;
  topics: TopicDraft[];
}

// Flat, ordered topics -> units. Topics with the same unit name in a row share a unit.
const toUnits = (items: SyllabusItem[], nextKey: () => number): UnitDraft[] => {
  const units: UnitDraft[] = [];
  for (const it of items) {
    let u = units[units.length - 1];
    if (!u || u.name !== it.unit) {
      u = { key: nextKey(), name: it.unit, topics: [] };
      units.push(u);
    }
    u.topics.push({ key: nextKey(), id: it._id, title: it.title });
  }
  return units;
};

const toFlat = (units: UnitDraft[]): SyllabusItem[] =>
  units.flatMap((u) =>
    u.topics
      .filter((t) => t.title.trim())
      .map((t) => ({ unit: u.name.trim(), title: t.title.trim(), ...(t.id ? { _id: t.id } : {}) }))
  );

const move = <T,>(list: T[], i: number, dir: -1 | 1): T[] => {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

// Lines starting with # start a new unit; every other line is a topic.
const parseBulk = (text: string, nextKey: () => number): UnitDraft[] => {
  const units: UnitDraft[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) {
      units.push({ key: nextKey(), name: line.replace(/^#+\s*/, "").slice(0, 80), topics: [] });
      continue;
    }
    if (!units.length) units.push({ key: nextKey(), name: "", topics: [] });
    units[units.length - 1].topics.push({ key: nextKey(), title: line.replace(/^([-*]|\d+[.)])\s+/, "").slice(0, 160) });
  }
  return units;
};

export default function SyllabusEditor({
  value,
  onChange,
}: {
  value: SyllabusItem[];
  onChange: (items: SyllabusItem[]) => void;
}) {
  const counter = useRef(0);
  const nextKey = () => (counter.current += 1);
  const [units, setUnits] = useState<UnitDraft[]>(() => toUnits(value, nextKey));
  const [bulk, setBulk] = useState("");

  const commit = (next: UnitDraft[]) => {
    setUnits(next);
    onChange(toFlat(next));
  };
  const setUnit = (i: number, patch: Partial<UnitDraft>) => commit(units.map((u, k) => (k === i ? { ...u, ...patch } : u)));
  const setTopics = (i: number, topics: TopicDraft[]) => setUnit(i, { topics });

  const total = units.reduce((n, u) => n + u.topics.filter((t) => t.title.trim()).length, 0);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p className={styles.sectionSubtitle} style={{ margin: 0 }}>
        Teachers tick these off for each batch, and students see the progress. {total} topic{total === 1 ? "" : "s"} so far.
      </p>

      {units.map((u, ui) => (
        <div
          key={u.key}
          style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 12, display: "grid", gap: 8 }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              className={styles.input}
              style={{ flex: 1, minWidth: 160 }}
              value={u.name}
              maxLength={80}
              placeholder="Unit / chapter name (optional)"
              aria-label={`Unit ${ui + 1} name`}
              onChange={(e) => setUnit(ui, { name: e.target.value })}
            />
            <button type="button" className={styles.smallButton} disabled={ui === 0} onClick={() => commit(move(units, ui, -1))} aria-label="Move unit up">
              Up
            </button>
            <button type="button" className={styles.smallButton} disabled={ui === units.length - 1} onClick={() => commit(move(units, ui, 1))} aria-label="Move unit down">
              Down
            </button>
            <button type="button" className={styles.dangerButton} onClick={() => commit(units.filter((_, k) => k !== ui))}>
              Remove unit
            </button>
          </div>

          {u.topics.map((t, ti) => (
            <div key={t.key} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", paddingLeft: 12 }}>
              <input
                className={styles.input}
                style={{ flex: 1, minWidth: 160 }}
                value={t.title}
                maxLength={160}
                placeholder="Topic"
                aria-label={`Topic ${ti + 1} in unit ${ui + 1}`}
                onChange={(e) => setTopics(ui, u.topics.map((x, k) => (k === ti ? { ...x, title: e.target.value } : x)))}
              />
              <button type="button" className={styles.smallButton} disabled={ti === 0} onClick={() => setTopics(ui, move(u.topics, ti, -1))} aria-label="Move topic up">
                Up
              </button>
              <button type="button" className={styles.smallButton} disabled={ti === u.topics.length - 1} onClick={() => setTopics(ui, move(u.topics, ti, 1))} aria-label="Move topic down">
                Down
              </button>
              <button type="button" className={styles.smallButton} onClick={() => setTopics(ui, u.topics.filter((_, k) => k !== ti))} aria-label="Remove topic">
                Remove
              </button>
            </div>
          ))}

          <div style={{ paddingLeft: 12 }}>
            <button
              type="button"
              className={styles.smallButton}
              onClick={() => setTopics(ui, [...u.topics, { key: nextKey(), title: "" }])}
            >
              + Add topic
            </button>
          </div>
        </div>
      ))}

      <div>
        <button
          type="button"
          className={styles.smallButton}
          onClick={() => commit([...units, { key: nextKey(), name: "", topics: [{ key: nextKey(), title: "" }] }])}
        >
          + Add unit
        </button>
      </div>

      <label className={styles.label}>
        Or paste many topics at once
        <textarea
          className={styles.input}
          rows={6}
          value={bulk}
          placeholder={"# Unit 1 - Kinematics\nMotion in a straight line\nProjectile motion\n# Unit 2 - Laws of motion\nNewton's laws"}
          onChange={(e) => setBulk(e.target.value)}
        />
        <span className={styles.sectionSubtitle} style={{ margin: 0, fontWeight: 400 }}>
          One topic per line. A line starting with # begins a new unit. They are added after the ones above.
        </span>
      </label>
      <div>
        <button
          type="button"
          className={styles.smallButton}
          disabled={!bulk.trim()}
          onClick={() => {
            const added = parseBulk(bulk, nextKey);
            if (!added.length) return;
            commit([...units, ...added]);
            setBulk("");
          }}
        >
          Add pasted topics
        </button>
      </div>
    </div>
  );
}
