"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, Institute } from "@/lib/api";
import SignupShared from "../../signup/SignupShared";
import styles from "../../signup/signup.module.css";

export default function InstituteSignupPage() {
  const { institute: slug } = useParams<{ institute: string }>();
  const [institute, setInstitute] = useState<Institute | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .publicInstitute(slug)
      .then((res) => setInstitute(res.institute))
      .catch(() => setInstitute(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className={styles.wrapper} />;
  }

  return <SignupShared institute={institute} basePath={`/${slug}`} />;
}
