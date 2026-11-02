"use client";

import { useEffect, useState } from "react";
import { ApiError, Receipt } from "@/lib/api";
import Modal from "./Modal";
import styles from "./dashboard.module.css";
import adminStyles from "./admin/admin.module.css";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function rows(r: Receipt): [string, string][] {
  const list: [string, string][] = [
    ["Receipt no.", r.receiptNo],
    ["Date", new Date(r.paidAt).toLocaleString()],
    ["Received from", r.student.name],
    ["Email", r.student.email],
  ];
  if (r.student.phone) list.push(["Phone", r.student.phone]);
  if (r.course) list.push(["Course", r.course]);
  list.push(["Payment method", r.method]);
  if (r.transactionId) list.push(["Transaction ID", r.transactionId]);
  list.push(["Received by", r.receivedBy]);
  if (r.note) list.push(["Note", r.note]);
  return list;
}

// Opens a clean printable page; the browser's print dialog also offers "Save as PDF".
function printReceipt(r: Receipt) {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  const body = rows(r)
    .map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`)
    .join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(r.receiptNo)}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:40px}
  .box{max-width:640px;margin:0 auto;border:1px solid #ccc;padding:32px}
  h1{margin:0 0 4px;font-size:22px} .sub{color:#555;margin:0 0 24px}
  table{width:100%;border-collapse:collapse} td{padding:8px 0;border-bottom:1px solid #eee;vertical-align:top}
  td.k{color:#555;width:38%} .amount{margin:24px 0;font-size:28px;font-weight:700}
  .paid{display:inline-block;padding:2px 10px;border:1px solid #15803d;color:#15803d;border-radius:4px;font-size:12px;margin-left:8px;vertical-align:middle}
  .foot{margin-top:28px;color:#777;font-size:12px}
</style></head><body><div class="box">
  <h1>${esc(r.institute.name || "Payment receipt")}</h1>
  <p class="sub">Payment receipt</p>
  <div class="amount">₹${r.amount}<span class="paid">${r.status === "paid" ? "PAID" : esc(r.status.toUpperCase())}</span></div>
  <table>${body}</table>
  <p class="foot">This is a computer-generated receipt.</p>
</div><script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
}

export default function ReceiptModal({
  load,
  onClose,
}: {
  load: () => Promise<{ receipt: Receipt }>;
  onClose: () => void;
}) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    load()
      .then((res) => setReceipt(res.receipt))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load the receipt"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal onClose={onClose} dialogStyle={{ maxWidth: 520, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
      <div className={styles.modalHead}>
        <h2 className={adminStyles.sectionTitle}>Payment receipt</h2>
        <button className={styles.modalCloseButton} type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      {error && <p className={adminStyles.messageError}>{error}</p>}
      {!receipt && !error && <p className={adminStyles.empty}>Loading...</p>}
      {receipt && (
        <>
          <p className={adminStyles.sectionSubtitle}>{receipt.institute.name}</p>
          <p style={{ fontSize: "1.8rem", fontWeight: 700, margin: "8px 0 14px" }}>₹{receipt.amount}</p>
          <div style={{ display: "grid", gap: 8 }}>
            {rows(receipt).map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span className={adminStyles.sectionSubtitle} style={{ margin: 0 }}>
                  {k}
                </span>
                <span style={{ textAlign: "right", wordBreak: "break-word" }}>{v}</span>
              </div>
            ))}
          </div>
          <div className={adminStyles.formActions} style={{ marginTop: 18, justifyContent: "flex-end" }}>
            <button className={adminStyles.primaryButton} type="button" onClick={() => printReceipt(receipt)}>
              Download / Print PDF
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
