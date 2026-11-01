"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError, OwnInstitute } from "@/lib/api";
import { brandVars, buildPalette, contrast, isHex } from "@/lib/palette";
import adminStyles from "./admin.module.css";

const DEFAULT_ACCENT = "#047857";

const PRESETS = ["#047857", "#2563eb", "#7c3aed", "#db2777", "#dc2626", "#ea580c", "#ca8a04", "#16a34a", "#0d9488", "#0f172a"];

function PreviewCard({ color, mode }: { color: string; mode: "light" | "dark" }) {
  return (
    <div
      style={{
        ...brandVars(color, mode),
        flex: "1 1 240px",
        minWidth: 0,
        padding: 14,
        borderRadius: 14,
        background: "var(--background)",
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}>
        {mode === "light" ? "Light mode" : "Dark mode"}
      </div>
      <div
        style={{
          padding: 14,
          borderRadius: 12,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <strong style={{ color: "var(--foreground)" }}>Welcome back</strong>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>Here is what is happening at your institute today.</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              padding: "7px 14px",
              borderRadius: 10,
              color: "var(--on-brand)",
              fontWeight: 600,
              fontSize: 13,
              background: "var(--brand)",
            }}
          >
            Primary button
          </span>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              background: "var(--brand-soft)",
              color: "var(--brand-dark)",
            }}
          >
            Badge
          </span>
          <span style={{ color: "var(--brand)", fontSize: 13, fontWeight: 600 }}>A link</span>
        </div>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className={adminStyles.label}>
      {label}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 44,
            height: 38,
            padding: 2,
            border: "1px solid var(--border)",
            borderRadius: 8,
            background: "var(--surface-alt)",
          }}
        />
        <input
          className={adminStyles.input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern="^#[0-9a-fA-F]{6}$"
          placeholder={placeholder}
          style={{ flex: 1 }}
        />
      </div>
    </label>
  );
}

export default function AdminBrandingSettings() {
  const { setInstitute: setGlobalInstitute } = useAuth();
  const [institute, setInstitute] = useState<OwnInstitute | null>(null);
  const [loading, setLoading] = useState(true);

  const [slugInput, setSlugInput] = useState("");
  const [accentInput, setAccentInput] = useState(DEFAULT_ACCENT);
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
        setAccentInput(res.institute.brandColor || DEFAULT_ACCENT);
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
        brandColor: accentInput,
        // Derived automatically from the one brand colour now — clear any
        // values saved by the old 3-colour picker so they cannot linger.
        brandColorPrimary: "",
        brandColorBackground: "",
        logo: logoFile,
      });
      setInstitute(res.institute);
      // Keep the header's logo/colors in sync immediately — the slug in the
      // JWT (used by middleware) still needs a re-login, but the visible
      // branding shouldn't require a reload.
      if (res.institute.instituteSlug) {
        setGlobalInstitute({
          name: res.institute.name,
          slug: res.institute.instituteSlug,
          brandColor: res.institute.brandColor,
          brandColorPrimary: res.institute.brandColorPrimary,
          brandColorBackground: res.institute.brandColorBackground,
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

          <p className={adminStyles.sectionSubtitle} style={{ gridColumn: "1 / -1", margin: "4px 0 0" }}>
            Pick one brand colour. Backgrounds, text, borders and the dark theme are chosen for you
            automatically so everything stays readable — whatever you pick.
          </p>

          <div style={{ gridColumn: "1 / -1" }}>
            <ColorField label="Brand colour" value={accentInput} onChange={setAccentInput} placeholder={DEFAULT_ACCENT} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Use ${c}`}
                  onClick={() => setAccentInput(c)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: c,
                    cursor: "pointer",
                    border: accentInput.toLowerCase() === c ? "3px solid var(--foreground)" : "2px solid var(--border)",
                  }}
                />
              ))}
            </div>
          </div>

          {isHex(accentInput) ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <PreviewCard color={accentInput} mode="light" />
                <PreviewCard color={accentInput} mode="dark" />
              </div>
              {buildPalette(accentInput).adjusted && (
                <p className={adminStyles.sectionSubtitle} style={{ margin: "10px 0 0" }}>
                  Your colour was a little too light for white button text (contrast{" "}
                  {contrast("#ffffff", accentInput).toFixed(1)}:1), so it is slightly darkened in the light theme
                  to stay readable. The dark theme uses its own tuned shade.
                </p>
              )}
            </div>
          ) : (
            <p className={adminStyles.messageError} style={{ gridColumn: "1 / -1" }}>
              Enter a colour like #047857.
            </p>
          )}

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
            <button className={adminStyles.primaryButton} type="submit" disabled={saving || !isHex(accentInput)}>
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
