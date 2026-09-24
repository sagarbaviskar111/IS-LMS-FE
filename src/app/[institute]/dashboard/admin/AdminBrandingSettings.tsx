"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError, OwnInstitute } from "@/lib/api";
import dashboardStyles from "../dashboard.module.css";
import adminStyles from "./admin.module.css";

export default function AdminBrandingSettings() {
  const { setInstitute: setGlobalInstitute } = useAuth();
  const [institute, setInstitute] = useState<OwnInstitute | null>(null);
  const [loading, setLoading] = useState(true);

  const [slugInput, setSlugInput] = useState("");
  const [colorInput, setColorInput] = useState("#4f46e5");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    return api
      .getBranding()
      .then((res) => {
        setInstitute(res.institute);
        setSlugInput(res.institute.instituteSlug || "");
        setColorInput(res.institute.brandColor || "#4f46e5");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const slugChanged = institute ? slugInput.trim() !== (institute.instituteSlug || "") : false;

  const handleFile = (file: File | null) => {
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      const res = await api.updateBranding({
        instituteSlug: slugInput.trim(),
        brandColor: colorInput,
        logo: logoFile,
      });
      setInstitute(res.institute);
      // Keep the header's logo/color in sync immediately — the slug in the
      // JWT (used by middleware) still needs a re-login, but the visible
      // branding shouldn't require a reload.
      if (res.institute.instituteSlug) {
        setGlobalInstitute({
          name: res.institute.name,
          slug: res.institute.instituteSlug,
          brandColor: res.institute.brandColor,
          logoUrl: res.institute.logoUrl,
        });
      }
      setLogoFile(null);
      setLogoPreview(null);
      setNotice(
        slugChanged
          ? "Saved. Your institute's address has changed — log out and back in for it to take effect everywhere."
          : "Saved."
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save branding");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className={adminStyles.empty}>Loading...</p>;
  }

  return (
    <div>
      <h1 className={dashboardStyles.pageTitle}>Branding</h1>
      <p className={dashboardStyles.pageSubtitle}>
        Your institute&apos;s own login address, logo and accent color — shown to your students,
        teachers and telecallers.
      </p>

      <section className={adminStyles.section}>
        <form className={adminStyles.form} onSubmit={handleSubmit}>
          <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
            Your institute&apos;s address
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--muted)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                {origin}/
              </span>
              <input
                className={adminStyles.input}
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                placeholder="your-institute-name"
                required
              />
            </div>
          </label>

          <label className={adminStyles.label}>
            Accent color
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="color"
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                style={{ width: 44, height: 38, padding: 2, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-alt)" }}
              />
              <input
                className={adminStyles.input}
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                pattern="^#[0-9a-fA-F]{6}$"
                placeholder="#4f46e5"
                style={{ flex: 1 }}
              />
            </div>
          </label>

          <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
            Logo
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {(logoPreview || institute?.logoUrl) && (
                <span className={adminStyles.logoPreviewChip}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoPreview || institute?.logoUrl || ""} alt="Institute logo" />
                </span>
              )}
              <input
                className={adminStyles.fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
                style={{ flex: 1 }}
              />
            </div>
            <span style={{ fontWeight: 400, color: "var(--muted)" }}>
              PNG, JPG or WebP. A wide logo with a transparent background looks best.
            </span>
          </label>

          <div className={adminStyles.formActions}>
            <button className={adminStyles.primaryButton} type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
            {error && <p className={adminStyles.messageError}>{error}</p>}
            {notice && <p className={adminStyles.messageSuccess}>{notice}</p>}
          </div>
        </form>
      </section>
    </div>
  );
}
