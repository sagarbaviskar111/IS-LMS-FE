"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError, ExamResult, StudentExamTake as TakeResponse } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "../admin/admin.module.css";
import studentStyles from "./student.module.css";
import StudentLoading from "./StudentLoading";
import StudentEmptyState from "./StudentEmptyState";

type ViewState = "loading" | "take" | "pending" | "result" | "closed" | "error";

export default function StudentExamTake() {
  const { id } = useParams<{ id: string }>();

  const [state, setState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [take, setTake] = useState<TakeResponse | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    api
      .studentGetExam(id)
      .then((res) => {
        setTake(res);
        if (res.alreadySubmitted) {
          if (res.resultsAnnounced) {
            api
              .studentExamResult(id)
              .then((r) => {
                setResult(r);
                setState("result");
              })
              .catch(() => setState("pending"));
          } else {
            setState("pending");
          }
        } else {
          setState("take");
        }
      })
      .catch((err) => {
        setErrorMessage(err instanceof ApiError ? err.message : "Could not load this exam");
        setState(err instanceof ApiError && err.status === 403 ? "closed" : "error");
      });
  }, [id]);

  const handleSubmit = async () => {
    if (!take?.exam.questions) return;
    const unanswered = take.exam.questions.filter((q) => answers[q._id] === undefined);
    if (unanswered.length > 0) {
      if (!window.confirm(`You haven't answered ${unanswered.length} question(s). Submit anyway?`)) {
        return;
      }
    } else if (!window.confirm("Submit your answers? This can't be undone.")) {
      return;
    }

    setSubmitError("");
    setSubmitting(true);
    try {
      await api.studentSubmitExam(
        id,
        Object.entries(answers).map(([question, selectedOptionIndex]) => ({ question, selectedOptionIndex }))
      );
      setState("pending");
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (state === "loading") return <StudentLoading />;

  if (state === "closed" || state === "error") {
    return (
      <div>
        <h1 className={dashboardStyles.pageTitle}>Exam</h1>
        <StudentEmptyState title="Can't open this exam" hint={errorMessage} />
      </div>
    );
  }

  if (state === "pending") {
    return (
      <div>
        <h1 className={dashboardStyles.pageTitle}>{take?.exam.title}</h1>
        <StudentEmptyState
          title="Submitted — awaiting results"
          hint="Your teacher hasn't announced results yet. Check back later."
        />
      </div>
    );
  }

  if (state === "result" && result) {
    return (
      <div>
        <h1 className={dashboardStyles.pageTitle}>{take?.exam.title}</h1>
        <div className={dashboardStyles.cardGrid} style={{ marginBottom: 20 }}>
          <div className={dashboardStyles.card}>
            <p className={dashboardStyles.cardLabel}>Your score</p>
            <p className={dashboardStyles.cardValue}>
              {result.score} / {result.totalMarks}
            </p>
          </div>
        </div>

        <section className={adminStyles.section}>
          <div className={adminStyles.sectionHead}>
            <div>
              <h2 className={adminStyles.sectionTitle}>Review</h2>
            </div>
          </div>

          {result.questions.map((q, i) => (
            <div key={q._id} className={adminStyles.section} style={{ marginBottom: 10 }}>
              <p style={{ fontWeight: 600, marginBottom: 8, wordBreak: "break-word" }}>
                {i + 1}. {q.text}{" "}
                <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                  ({q.selectedOptionIndex === q.correctOptionIndex ? q.marks : 0}/{q.marks})
                </span>
              </p>
              <ul className={studentStyles.reviewList}>
                {q.options.map((opt, oi) => {
                  const isCorrect = oi === q.correctOptionIndex;
                  const isSelected = oi === q.selectedOptionIndex;
                  const optionClass = isCorrect
                    ? studentStyles.reviewCorrect
                    : isSelected
                    ? studentStyles.reviewIncorrect
                    : "";
                  return (
                    <li key={oi} className={`${studentStyles.reviewOption} ${optionClass}`}>
                      <span className={studentStyles.optionText}>{opt}</span>
                      {isCorrect && <span className={studentStyles.reviewTag}>Correct</span>}
                      {isSelected && !isCorrect && <span className={studentStyles.reviewTag}>Your answer</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      </div>
    );
  }

  if (state === "take" && take?.exam.questions) {
    return (
      <div>
        <h1 className={dashboardStyles.pageTitle}>{take.exam.title}</h1>
        <p className={dashboardStyles.pageSubtitle}>{take.exam.description || "Answer all questions below."}</p>

        {take.exam.questions.map((q, i) => (
          <div key={q._id} className={adminStyles.section} style={{ marginBottom: 12 }}>
            <p style={{ fontWeight: 600, marginBottom: 10, wordBreak: "break-word" }}>
              {i + 1}. {q.text}{" "}
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                ({q.marks} mark{q.marks > 1 ? "s" : ""})
              </span>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {q.options.map((opt, oi) => (
                <label
                  key={oi}
                  className={`${studentStyles.optionRow} ${
                    answers[q._id] === oi ? studentStyles.optionRowSelected : ""
                  }`}
                >
                  <input
                    className={studentStyles.optionRadio}
                    type="radio"
                    name={`q-${q._id}`}
                    checked={answers[q._id] === oi}
                    onChange={() => setAnswers({ ...answers, [q._id]: oi })}
                  />
                  <span className={studentStyles.optionText}>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className={adminStyles.formActions}>
          <button className={adminStyles.primaryButton} onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit exam"}
          </button>
          {submitError && <p className={adminStyles.messageError}>{submitError}</p>}
        </div>
      </div>
    );
  }

  return null;
}
