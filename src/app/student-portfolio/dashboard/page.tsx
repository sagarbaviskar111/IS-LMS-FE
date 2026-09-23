"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError, PortfolioOwn, PortfolioUpdatePayload } from "@/lib/api";
import PortfolioForm from "../PortfolioForm";
import ThemeToggle from "@/components/ThemeToggle";
import styles from "./PortfolioDashboard.module.css";

export default function PortfolioDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioOwn | null>(null);
  const [pageError, setPageError] = useState("");
  const [copied, setCopied] = useState(false);

  const [profileUploading, setProfileUploading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [backgroundUploading, setBackgroundUploading] = useState(false);
  const [backgroundError, setBackgroundError] = useState("");

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const profileInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .portfolioMe()
      .then((res) => setPortfolio(res.portfolio))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/student-portfolio/login");
          return;
        }
        setPageError(
          err instanceof ApiError ? err.message : "Could not load your portfolio"
        );
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = async () => {
    if (!portfolio) return;
    try {
      await navigator.clipboard.writeText(
        `institutesathi.com/student-portfolio/${portfolio.slug}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore — the link text is already visible for manual copying.
    }
  };

  const handleLogout = async () => {
    try {
      await api.portfolioLogout();
    } catch {
      // Even if the request fails, still send the user back to login.
    }
    router.push("/student-portfolio/login");
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileError("");
    setProfileUploading(true);
    try {
      const { portfolio: updated } = await api.portfolioUploadProfilePicture(file);
      setPortfolio(updated);
    } catch (err) {
      setProfileError(
        err instanceof ApiError ? err.message : "Could not upload profile picture"
      );
    } finally {
      setProfileUploading(false);
      if (profileInputRef.current) profileInputRef.current.value = "";
    }
  };

  const handleRemoveProfilePicture = async () => {
    setProfileError("");
    setProfileUploading(true);
    try {
      const { portfolio: updated } = await api.portfolioDeleteProfilePicture();
      setPortfolio(updated);
    } catch (err) {
      setProfileError(
        err instanceof ApiError ? err.message : "Could not remove profile picture"
      );
    } finally {
      setProfileUploading(false);
    }
  };

  const handleBackgroundImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackgroundError("");
    setBackgroundUploading(true);
    try {
      const { portfolio: updated } = await api.portfolioUploadBackgroundImage(file);
      setPortfolio(updated);
    } catch (err) {
      setBackgroundError(
        err instanceof ApiError ? err.message : "Could not upload background image"
      );
    } finally {
      setBackgroundUploading(false);
      if (backgroundInputRef.current) backgroundInputRef.current.value = "";
    }
  };

  const handleRemoveBackgroundImage = async () => {
    setBackgroundError("");
    setBackgroundUploading(true);
    try {
      const { portfolio: updated } = await api.portfolioDeleteBackgroundImage();
      setPortfolio(updated);
    } catch (err) {
      setBackgroundError(
        err instanceof ApiError ? err.message : "Could not remove background image"
      );
    } finally {
      setBackgroundUploading(false);
    }
  };

  const handleUpdate = async (payload: PortfolioUpdatePayload) => {
    setFormError("");
    setFormSubmitting(true);
    try {
      const { portfolio: updated } = await api.portfolioUpdate(payload);
      setPortfolio(updated);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 3000);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Could not save changes");
    } finally {
      setFormSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles.loadingWrapper}>Loading...</div>;
  }

  if (!portfolio) {
    return (
      <div className={styles.loadingWrapper}>
        {pageError || "Could not load your portfolio."}
      </div>
    );
  }

  const publicPath = `/student-portfolio/${portfolio.slug}`;
  const publicLinkText = `institutesathi.com/student-portfolio/${portfolio.slug}`;

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.linkGroup}>
          <span className={styles.linkLabel}>Your public portfolio</span>
          <div className={styles.linkRow}>
            <Link href={publicPath} className={styles.publicLink}>
              {publicPath}
            </Link>
            <span className={styles.publicLinkFull}>{publicLinkText}</span>
            <button type="button" className={styles.smallButton} onClick={handleCopy}>
              {copied ? "Copied!" : "Copy link"}
            </button>
            <a
              href={publicPath}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.smallButton}
            >
              View public page
            </a>
          </div>
        </div>

        <div className={styles.actions}>
          <ThemeToggle />
          <button type="button" className={styles.logoutButton} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      <div className={styles.imagesRow}>
        <div className={styles.uploadCard}>
          <h3 className={styles.uploadTitle}>Profile picture</h3>
          <div className={styles.imagePreviewWrap}>
            {portfolio.profilePictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={portfolio.profilePictureUrl}
                alt="Profile"
                className={styles.imagePreview}
              />
            ) : (
              <span className={styles.imagePlaceholder}>No image</span>
            )}
          </div>
          <div className={styles.uploadActions}>
            <label
              className={`${styles.fileButton} ${
                profileUploading ? styles.fileButtonDisabled : ""
              }`}
            >
              {profileUploading ? "Uploading..." : "Upload image"}
              <input
                ref={profileInputRef}
                className={styles.fileInput}
                type="file"
                accept="image/*"
                disabled={profileUploading}
                onChange={handleProfilePictureChange}
              />
            </label>
            {portfolio.profilePictureUrl && (
              <button
                type="button"
                className={styles.removeImageButton}
                disabled={profileUploading}
                onClick={handleRemoveProfilePicture}
              >
                Remove
              </button>
            )}
          </div>
          {profileError && <p className={styles.imageError}>{profileError}</p>}
        </div>

        <div className={styles.uploadCard}>
          <h3 className={styles.uploadTitle}>Background image</h3>
          <div className={styles.imagePreviewWrap}>
            {portfolio.backgroundImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={portfolio.backgroundImageUrl}
                alt="Background"
                className={styles.imagePreview}
              />
            ) : (
              <span className={styles.imagePlaceholder}>No image</span>
            )}
          </div>
          <div className={styles.uploadActions}>
            <label
              className={`${styles.fileButton} ${
                backgroundUploading ? styles.fileButtonDisabled : ""
              }`}
            >
              {backgroundUploading ? "Uploading..." : "Upload image"}
              <input
                ref={backgroundInputRef}
                className={styles.fileInput}
                type="file"
                accept="image/*"
                disabled={backgroundUploading}
                onChange={handleBackgroundImageChange}
              />
            </label>
            {portfolio.backgroundImageUrl && (
              <button
                type="button"
                className={styles.removeImageButton}
                disabled={backgroundUploading}
                onClick={handleRemoveBackgroundImage}
              >
                Remove
              </button>
            )}
          </div>
          {backgroundError && <p className={styles.imageError}>{backgroundError}</p>}
        </div>
      </div>

      <div className={styles.formWrap}>
        {savedAt && <div className={styles.savedBanner}>Saved just now</div>}
        <PortfolioForm
          mode="edit"
          initial={portfolio}
          onSubmitUpdate={handleUpdate}
          submitting={formSubmitting}
          error={formError}
        />
      </div>
    </div>
  );
}
