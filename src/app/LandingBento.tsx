"use client";

import { useEffect, useState } from "react";
import styles from "./LandingBento.module.css";

// Every tile shows a small working piece of the real product (sample data),
// instead of an icon + paragraph. Several are interactive on purpose: people
// remember what they clicked.

const STUDENTS = [
  { name: "Aarav Sharma", roll: "Roll 14" },
  { name: "Priya Verma", roll: "Roll 21" },
  { name: "Rohit Singh", roll: "Roll 07" },
  { name: "Sneha Patil", roll: "Roll 33" },
  { name: "Imran Khan", roll: "Roll 18" },
];

// The five rows are a sample of a 50-student batch; the other 45 are fixed.
const TOTAL_STUDENTS = 50;
const OTHERS_PRESENT = 43;

function AttendanceTile() {
  const [present, setPresent] = useState<boolean[]>([true, true, false, true, true]);
  const count = OTHERS_PRESENT + present.filter(Boolean).length;
  const pct = Math.round((count / TOTAL_STUDENTS) * 100);

  return (
    <article className={`${styles.tile} ${styles.attendance}`}>
      <header className={styles.head}>
        <span className={styles.kicker}>Batch &amp; attendance</span>
        <h3 className={styles.title}>Mark a whole batch in seconds.</h3>
      </header>

      <div className={styles.sheet}>
        <div className={styles.sheetTop}>
          <div>
            <strong>Class 10th Math Batch</strong>
            <span className={styles.muted}>Today&apos;s class · 8:00 AM</span>
          </div>
          <div className={styles.liveCount} aria-live="polite">
            <strong>
              {count}/{TOTAL_STUDENTS}
            </strong>
            <span>{pct}% present</span>
          </div>
        </div>
        <div className={styles.bar} aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <ul className={styles.rows}>
          {STUDENTS.map((s, i) => (
            <li key={s.roll} className={styles.row}>
              <span className={styles.avatar}>{s.name[0]}</span>
              <span className={styles.rowName}>
                {s.name}
                <small>{s.roll}</small>
              </span>
              <button
                type="button"
                aria-pressed={present[i]}
                className={`${styles.pill} ${present[i] ? styles.pillOn : styles.pillOff}`}
                onClick={() => setPresent((p) => p.map((v, idx) => (idx === i ? !v : v)))}
              >
                {present[i] ? "Present" : "Absent"}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className={styles.caption}>
        Tap to mark. Saved groups like <em>“Class 10th Repeaters · 42”</em> drop into any batch in one click.
      </p>
    </article>
  );
}

function FeesTile() {
  const [auto, setAuto] = useState(true);
  const rows = [
    { name: "Aarav Sharma", amount: "Class 10th Math · ₹1,500", state: "due", label: "Fee due" },
    { name: "Priya Verma", amount: "Class 10th Math · ₹2,000", state: "paid", label: "Paid" },
    { name: "Rohit Singh", amount: "Class 12th Physics · ₹1,500", state: "late", label: "Grace: 2 days left" },
  ];
  return (
    <article className={`${styles.tile} ${styles.fees}`}>
      <header className={styles.head}>
        <span className={styles.kicker}>Fees &amp; reminders</span>
        <h3 className={styles.title}>Dues chase themselves.</h3>
      </header>

      <div className={styles.collected}>
        <div>
          <span className={styles.muted}>Collected this month</span>
          <strong>₹86,500</strong>
        </div>
        <div className={styles.bar} aria-hidden="true">
          <span style={{ width: "72%" }} />
        </div>
        <span className={styles.muted}>of ₹1,20,000 expected</span>
      </div>

      <ul className={styles.feeList}>
        {rows.map((r) => (
          <li key={r.name} className={styles.feeRow}>
            <span className={styles.rowName}>
              {r.name}
              <small>{r.amount}</small>
            </span>
            <span className={`${styles.chip} ${styles[`chip_${r.state}`]}`}>{r.label}</span>
          </li>
        ))}
      </ul>

      <button type="button" role="switch" aria-checked={auto} className={styles.switchRow} onClick={() => setAuto((a) => !a)}>
        <span className={`${styles.switch} ${auto ? styles.switchOn : ""}`} aria-hidden="true">
          <span />
        </span>
        <span>Daily email reminders</span>
      </button>
      <p className={styles.bubble} data-off={!auto}>
        {auto ? "✓ Email reminder sent:“Hi, Aarav's ₹1,500 fee is due on 5 Nov. Pay from your login.”" : "Reminders paused. Nothing will be sent."}
      </p>
    </article>
  );
}

function AssignmentTile() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = Date.now() + (2 * 3600 + 14 * 60 + 9) * 1000;
    const tick = () => setLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const p = (n: number) => String(n).padStart(2, "0");
  const clock = left === null ? "02:14:09" : `${p(Math.floor(left / 3600))}:${p(Math.floor((left % 3600) / 60))}:${p(left % 60)}`;

  return (
    <article className={`${styles.tile} ${styles.assignment}`}>
      <header className={styles.head}>
        <span className={styles.kicker}>Assignments</span>
        <h3 className={styles.title}>Deadlines lock themselves.</h3>
      </header>
      <div className={styles.miniCard}>
        <strong>Quadratic Equations worksheet</strong>
        <span className={styles.muted}>Locks in</span>
        <span className={styles.clock}>{clock}</span>
        <div className={styles.bar} aria-hidden="true">
          <span style={{ width: "82%" }} />
        </div>
        <span className={styles.muted}>31 of 38 submitted</span>
      </div>
    </article>
  );
}

function RecordingTile() {
  return (
    <article className={`${styles.tile} ${styles.recording}`}>
      <header className={styles.head}>
        <span className={styles.kicker}>Session recordings</span>
        <h3 className={styles.title}>Class replays, no detours.</h3>
      </header>
      <div className={styles.player}>
        <span className={styles.play} aria-hidden="true" />
        <div className={styles.playerBar} aria-hidden="true">
          <span />
        </div>
        <div className={styles.playerMeta}>
          <span>Algebra · Chapter 4</span>
          <span>18:42 / 52:10</span>
        </div>
      </div>
    </article>
  );
}

const SWATCHES = [
  { name: "Emerald", color: "#047857" },
  { name: "Green", color: "#0f766e" },
  { name: "Maroon", color: "#9f1d35" },
  { name: "Orange", color: "#ea580c" },
];

function BrandingTile() {
  const [i, setI] = useState(0);
  const c = SWATCHES[i];
  return (
    <article className={`${styles.tile} ${styles.branding}`}>
      <header className={styles.head}>
        <span className={styles.kicker}>Your own portal</span>
        <h3 className={styles.title}>Your name, your logo, your link.</h3>
      </header>
      <div className={styles.browser}>
        <div className={styles.urlBar}>
          <span>🔒</span> sunrise-classes.institutesathi.com
        </div>
        <div className={styles.loginCard} style={{ ["--demo" as string]: c.color }}>
          <span className={styles.logoDot}>S</span>
          <strong>Sunrise Classes</strong>
          <span className={styles.fakeInput} />
          <span className={styles.fakeButton}>Log in</span>
        </div>
      </div>
      <div className={styles.swatches} role="group" aria-label="Pick an accent colour">
        {SWATCHES.map((s, idx) => (
          <button
            key={s.name}
            type="button"
            aria-label={s.name}
            aria-pressed={idx === i}
            className={`${styles.swatch} ${idx === i ? styles.swatchOn : ""}`}
            style={{ background: s.color }}
            onClick={() => setI(idx)}
          />
        ))}
      </div>
    </article>
  );
}

const ROLES = [
  { key: "Admin", menu: ["Students", "Fees", "Finance", "Certificates", "Batches"], sees: ["Fees, finance and certificates", "Batches, courses, teachers", "Leads and admissions"] },
  { key: "Teacher", menu: ["Sessions", "Attendance", "Exams", "Assignments"], sees: ["Only their own batches", "Attendance and study material", "Exams, assignments, reviews"] },
  { key: "Student", menu: ["Today", "Payments", "Certificates", "Assignments"], sees: ["Today's sessions on top", "Fees, receipts, certificates", "Assignments and results"] },
  { key: "Telecaller", menu: ["My leads", "Follow-ups"], sees: ["Only leads assigned to them", "Call log and follow-ups", "No access to fees or students"] },
];

function RolesTile() {
  const [r, setR] = useState(0);
  return (
    <article className={`${styles.tile} ${styles.roles}`}>
      <header className={styles.head}>
        <span className={styles.kicker}>Roles &amp; permissions</span>
        <h3 className={styles.title}>Everyone sees only their part.</h3>
      </header>
      <div className={styles.tabs} role="tablist">
        {ROLES.map((x, idx) => (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={idx === r}
            className={`${styles.tab} ${idx === r ? styles.tabOn : ""}`}
            onClick={() => setR(idx)}
          >
            {x.key}
          </button>
        ))}
      </div>
      <ul className={styles.seeList}>
        {ROLES[r].sees.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <div className={styles.menuPreview}>
        <span className={styles.muted}>Their menu</span>
        <div>
          {ROLES[r].menu.map((m) => (
            <span key={m} className={styles.menuItem}>
              {m}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function AdmissionsTile() {
  const stages = [
    { name: "New", n: 12 },
    { name: "Called", n: 8 },
    { name: "Visited", n: 5 },
    { name: "Enrolled", n: 3 },
  ];
  return (
    <article className={`${styles.tile} ${styles.admissions}`}>
      <header className={styles.head}>
        <span className={styles.kicker}>Admissions &amp; leads</span>
        <h3 className={styles.title}>From enquiry to enrolled.</h3>
      </header>
      <div className={styles.funnel}>
        {stages.map((s, i) => (
          <div key={s.name} className={styles.stage} style={{ ["--w" as string]: `${100 - i * 18}%` }}>
            <span>{s.name}</span>
            <strong>{s.n}</strong>
          </div>
        ))}
      </div>
      <p className={styles.caption}>Leads go to the telecaller with the fewest calls. Registration links collect the fee at signup.</p>
    </article>
  );
}

function ExamTile() {
  const bars = [32, 54, 71, 88, 63, 40];
  return (
    <article className={`${styles.tile} ${styles.exams}`}>
      <header className={styles.head}>
        <span className={styles.kicker}>Online exams</span>
        <h3 className={styles.title}>Results as they come in.</h3>
      </header>
      <div className={styles.chart} aria-hidden="true">
        {bars.map((h, i) => (
          <span key={i} style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className={styles.examMeta}>
        <strong>Unit Test 3 · Class 10th Math</strong>
        <span className={styles.muted}>Average 72% · 38 attempted</span>
      </div>
    </article>
  );
}

function CertificateTile() {
  return (
    <article className={`${styles.tile} ${styles.certificate}`}>
      <header className={styles.head}>
        <span className={styles.kicker}>Certificates</span>
        <h3 className={styles.title}>Genuine, and provably so.</h3>
      </header>
      <div className={styles.cert}>
        <span className={styles.certSmall}>Certificate of completion</span>
        <strong>Aarav Sharma</strong>
        <span className={styles.certSmall}>SUN/2026/0042</span>
        <span className={styles.qr} aria-hidden="true" />
      </div>
      <span className={`${styles.chip} ${styles.chip_paid}`}>✓ Scan to verify</span>
    </article>
  );
}

function MaterialTile() {
  const files = [
    { n: "Algebra notes.pdf", t: "PDF" },
    { n: "Chapter 4 – PYQs.pdf", t: "PDF" },
    { n: "Formula sheet.pdf", t: "PDF" },
  ];
  return (
    <article className={`${styles.tile} ${styles.material}`}>
      <header className={styles.head}>
        <span className={styles.kicker}>Study material</span>
        <h3 className={styles.title}>One library, never buried.</h3>
      </header>
      <ul className={styles.files}>
        {files.map((f) => (
          <li key={f.n}>
            <span className={styles.fileType}>{f.t}</span>
            <span>{f.n}</span>
          </li>
        ))}
      </ul>
      <p className={styles.caption}>Opens inside the app. No downloads, no lost links.</p>
    </article>
  );
}

export default function LandingBento() {
  return (
    <>
      <div className={styles.grid}>
        <AttendanceTile />
        <FeesTile />
        <AssignmentTile />
        <RecordingTile />
        <BrandingTile />
        <RolesTile />
        <AdmissionsTile />
        <ExamTile />
        <CertificateTile />
        <MaterialTile />
      </div>
      <p className={styles.note}>Previews use sample data.</p>
    </>
  );
}
