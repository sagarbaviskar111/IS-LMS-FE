"use client";

import { useParams } from "next/navigation";
import InquiryFormBuilder from "../../InquiryFormBuilder";

export default function EditInquiryFormPage() {
  const { id } = useParams<{ id: string }>();
  return <InquiryFormBuilder formId={id} />;
}
