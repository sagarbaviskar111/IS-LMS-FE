"use client";

import { ReactNode } from "react";
import adminStyles from "./admin.module.css";
import styles from "./VideoWizard.module.css";

export interface WizardStep {
  title: string;
  done?: boolean;
  // Hides the generic Back/Next bar for steps that drive their own action
  // (e.g. a form with its own submit button).
  hideNext?: boolean;
  content: ReactNode;
}

// A vertical, one-open-at-a-time checklist. Headers stay clickable so a
// returning admin can jump straight to the step they need.
export default function WizardSteps({
  steps,
  current,
  onChange,
}: {
  steps: WizardStep[];
  current: number;
  onChange: (index: number) => void;
}) {
  return (
    <div className={styles.steps}>
      {steps.map((step, i) => {
        const active = i === current;
        return (
          <div key={step.title} className={`${styles.step} ${active ? styles.stepActive : ""}`}>
            <button type="button" className={styles.stepHead} aria-expanded={active} onClick={() => onChange(active ? -1 : i)}>
              <span
                className={`${styles.badge} ${step.done ? styles.badgeDone : active ? styles.badgeActive : ""}`}
              >
                {step.done ? "✓" : i + 1}
              </span>
              <span className={styles.stepTitle}>{step.title}</span>
            </button>
            {active && (
              <div className={styles.stepBody}>
                {step.content}
                {!step.hideNext && (
                  <div className={styles.nav}>
                    {i > 0 && (
                      <button type="button" className={adminStyles.smallButton} onClick={() => onChange(i - 1)}>
                        Back
                      </button>
                    )}
                    {i < steps.length - 1 && (
                      <button type="button" className={adminStyles.primaryButton} onClick={() => onChange(i + 1)}>
                        Done, next step
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
