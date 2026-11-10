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

export default function LandingShowcase() {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const active = screenshots[activeIndex];

  return (
    <>
      <section id="showcase" className={sharedStyles.section}>
        <div className={sharedStyles.container}>
          <div className={sharedStyles.sectionHead}>
            <span className={sharedStyles.eyebrow}>Product tour</span>
            <h2 className={sharedStyles.sectionTitle}>The screens your team will use every day.</h2>
            <p className={sharedStyles.sectionSubtitle}>
              Screenshots from the live dashboard: batches, assignments, attendance and the student view.
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
    </>
  );
}
