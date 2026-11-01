import { ApiError } from "@/lib/api";

const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const errMsg = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export const pdfName = (certificateNo: string) => `${certificateNo.replace(/[^\w.-]+/g, "_")}.pdf`;
