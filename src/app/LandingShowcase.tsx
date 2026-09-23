"use client";

import { useState } from "react";
import sharedStyles from "./landing.module.css";
import styles from "./LandingShowcase.module.css";

type Screenshot = {
  src: string;
  label: string;
  caption: string;
};

const screenshots: Screenshot[] = [
  {
    src: "/landing/demo-batches.jpg",
    label: "Batches",
    caption:
      "Create batches and add students or teachers in a couple of clicks — including bulk-adding a saved student group.",
  },
  {
    src: "/landing/demo-assignments.jpg",
    label: "Assignments",
    caption:
      "Teachers set a due date, add instructions and an optional file — submissions auto-lock after the deadline.",
  },
  {
    src: "/landing/demo-attendance.jpg",
    label: "Attendance",
    caption: "Mark attendance per batch and see each student's record at a glance.",
  },
  {
    src: "/landing/demo-student.jpg",
    label: "Student view",
    caption:
      "Students get their own dashboard — attendance, assignments, material and recordings in one place.",
  },
];

type ImpactRow = {
  label: string;
  manual: number;
  sathi: number;
};

const impactData: ImpactRow[] = [
  { label: "Attendance tracking", manual: 3.5, sathi: 0.5 },
  { label: "Fee follow-ups", manual: 4, sathi: 1 },
  { label: "Sharing study material", manual: 2, sathi: 0.25 },
  { label: "Report generation", manual: 3, sathi: 0.5 },
];

const hoursSaved = impactData.reduce((sum, row) => sum + (row.manual - row.sathi), 0);
const hoursSavedLabel = `~${Math.round(hoursSaved)} hrs/week saved`;

// Chart geometry — computed, not hardcoded per-pixel.
const CHART_WIDTH = 640;
const CHART_HEIGHT = 320;
const MARGIN_TOP = 34;
const MARGIN_BOTTOM = 54;
const MARGIN_LEFT = 34;
const MARGIN_RIGHT = 16;
const PLOT_WIDTH = CHART_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
const MAX_VALUE = 4; // hrs/wk — rounds up from the highest value in impactData (4)
const Y_TICKS = [0, 1, 2, 3, 4];
const BAR_WIDTH = 22;
const BAR_GAP = 6;
const GROUP_WIDTH = PLOT_WIDTH / impactData.length;
const GROUP_INNER_WIDTH = BAR_WIDTH * 2 + BAR_GAP;
const GROUP_PADDING = (GROUP_WIDTH - GROUP_INNER_WIDTH) / 2;
const BASELINE_Y = MARGIN_TOP + PLOT_HEIGHT;

function valueToY(value: number): number {
  return MARGIN_TOP + PLOT_HEIGHT - (value / MAX_VALUE) * PLOT_HEIGHT;
}

export default function LandingShowcase() {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const active = screenshots[activeIndex];

  return (
    <>
      <section id="showcase" className={sharedStyles.section}>
        <div className={sharedStyles.container}>
          <div className={sharedStyles.sectionHeadCenter}>
            <span className={sharedStyles.eyebrow}>Product tour</span>
            <h2 className={sharedStyles.sectionTitle}>See InstituteSathi in action.</h2>
            <p className={sharedStyles.sectionSubtitle}>
              Real screens from the dashboard — how batches, assignments, attendance and the
              student view actually look day to day.
            </p>
          </div>

          <div className={styles.tabRow} role="tablist" aria-label="Product screenshots">
            {screenshots.map((shot, index) => (
              <button
                key={shot.src}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                className={index === activeIndex ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                onClick={() => setActiveIndex(index)}
              >
                {shot.label}
              </button>
            ))}
          </div>

          <div className={sharedStyles.browserFrame}>
            <div className={sharedStyles.browserFrameBar}>
              <span className={sharedStyles.browserDot} />
              <span className={sharedStyles.browserDot} />
              <span className={sharedStyles.browserDot} />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.src} alt={active.label} />
          </div>

          <p className={styles.caption}>{active.caption}</p>
        </div>
      </section>

      <section id="impact" className={sharedStyles.sectionAlt}>
        <div className={sharedStyles.container}>
          <div className={sharedStyles.sectionHeadCenter}>
            <span className={sharedStyles.eyebrow}>Time impact</span>
            <h2 className={sharedStyles.sectionTitle}>Hours back every week.</h2>
            <p className={sharedStyles.sectionSubtitle}>
              Moving attendance, fee follow-ups, material sharing and reporting off paper
              registers and WhatsApp threads and onto one dashboard frees up real admin time.
            </p>
          </div>

          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <div className={sharedStyles.statValue}>{hoursSavedLabel}</div>
              <div className={sharedStyles.statLabel}>across the 4 tasks below</div>
            </div>
            <div className={styles.statItem}>
              <div className={sharedStyles.statValue}>4 tasks</div>
              <div className={sharedStyles.statLabel}>automated end to end</div>
            </div>
            <div className={styles.statItem}>
              <div className={sharedStyles.statValue}>0</div>
              <div className={sharedStyles.statLabel}>spreadsheets needed</div>
            </div>
          </div>

          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={`${styles.legendSwatch} ${styles.legendSwatchManual}`} />
              Manual process
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.legendSwatch} ${styles.legendSwatchSathi}`} />
              With InstituteSathi
            </span>
          </div>

          <div className={styles.chartWrap}>
            <svg
              className={styles.chartSvg}
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              width="100%"
              role="img"
              aria-label="Bar chart comparing weekly hours spent on admin tasks manually versus with InstituteSathi, for attendance tracking, fee follow-ups, sharing study material and report generation."
            >
              {Y_TICKS.map((tick) => {
                const y = valueToY(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={MARGIN_LEFT}
                      x2={CHART_WIDTH - MARGIN_RIGHT}
                      y1={y}
                      y2={y}
                      className={styles.gridline}
                    />
                    <text x={MARGIN_LEFT - 8} y={y + 3} className={styles.axisText} textAnchor="end">
                      {tick}
                    </text>
                  </g>
                );
              })}

              {impactData.map((row, index) => {
                const groupX = MARGIN_LEFT + index * GROUP_WIDTH;
                const manualX = groupX + GROUP_PADDING;
                const sathiX = manualX + BAR_WIDTH + BAR_GAP;
                const manualY = valueToY(row.manual);
                const sathiY = valueToY(row.sathi);
                const manualHeight = BASELINE_Y - manualY;
                const sathiHeight = BASELINE_Y - sathiY;

                return (
                  <g key={row.label}>
                    <rect
                      x={manualX}
                      y={manualY}
                      width={BAR_WIDTH}
                      height={manualHeight}
                      rx={4}
                      className={styles.barManual}
                    />
                    <rect
                      x={sathiX}
                      y={sathiY}
                      width={BAR_WIDTH}
                      height={sathiHeight}
                      rx={4}
                      className={styles.barSathi}
                    />

                    <text x={manualX + BAR_WIDTH / 2} y={manualY - 6} className={styles.valueText} textAnchor="middle">
                      {row.manual}
                    </text>
                    <text x={sathiX + BAR_WIDTH / 2} y={sathiY - 6} className={styles.valueText} textAnchor="middle">
                      {row.sathi}
                    </text>

                    <text
                      x={groupX + GROUP_WIDTH / 2}
                      y={BASELINE_Y + 20}
                      className={styles.axisText}
                      textAnchor="middle"
                    >
                      {row.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <p className={styles.chartCaption}>
            Illustrative estimate based on typical manual-process time for a mid-sized institute —
            not an audited customer measurement.
          </p>
        </div>
      </section>
    </>
  );
}
