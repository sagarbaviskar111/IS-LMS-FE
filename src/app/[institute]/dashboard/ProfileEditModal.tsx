"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError, User } from "@/lib/api";
import styles from "./dashboard.module.css";
import adminStyles from "./admin/admin.module.css";

export default function ProfileEditModal({ user, onClose }: { user: User; onClose: () => void }) {
  const { setUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const initials = (name || user.name)
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleFile = (file: File | null) => {
    setAvatarFile(file);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
    if (file) setRemoveAvatar(false);
  };

  const handleRemovePhoto = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setRemoveAvatar(true);
  };

  const shownPhoto = avatarPreview || (!removeAvatar ? user.avatarUrl : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Name cannot be empty");
      return;
    }
    setSaving(true);
    try {
      const res = await api.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        avatar: avatarFile,
        removeAvatar,
      });
      setUser(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <h2 className={adminStyles.sectionTitle}>Edit profile</h2>
          <button className={styles.modalCloseButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className={adminStyles.form} onSubmit={handleSubmit}>
          <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
            Profile photo
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className={styles.avatarPreviewChip}>
                {shownPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shownPhoto} alt={name || user.name} />
                ) : (
                  <span className={styles.avatarPreviewInitials}>{initials}</span>
                )}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <input
                  className={adminStyles.fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFile(e.target.files?.[0] || null)}
                />
                {shownPhoto && (
                  <button
                    type="button"
                    className={adminStyles.smallButton}
                    style={{ alignSelf: "flex-start" }}
                    onClick={handleRemovePhoto}
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </label>

          <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
            <span>Name<span className={adminStyles.required}>*</span></span>
            <input
              className={adminStyles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </label>

          <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
            <span>Phone number<span style={{ fontWeight: 400, color: "var(--muted)" }}> (optional)</span></span>
            <input
              className={adminStyles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Add a phone number"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
            />
          </label>

          <div className={adminStyles.modalFooter}>
            <button className={adminStyles.primaryButton} type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button type="button" className={adminStyles.smallButton} onClick={onClose}>
              Cancel
            </button>
            {error && <p className={adminStyles.messageError}>{error}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
