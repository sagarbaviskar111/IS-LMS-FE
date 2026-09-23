"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, Institute } from "@/lib/api";
import LoginForm from "../../login/LoginForm";
import styles from "../../login/login.module.css";

export default function InstituteLoginPage() {
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

  return <LoginForm institute={institute} basePath={`/${slug}`} />;
}
