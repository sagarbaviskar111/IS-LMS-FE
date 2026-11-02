"use client";

import { useEffect, useState } from "react";
import styles from "./InstallPrompt.module.css";

// Chrome's install event; not in the DOM typings.
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

const recentlyDismissed = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return !!at && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
};

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// A small "Install the app" card. Chrome / Edge / Android get a real Install button;
// iPhone and iPad (Safari has no install event) get the Add to Home Screen steps.
export default function InstallPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const ua = navigator.userAgent;
    const iosSafari = /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (iosSafari) {
      setIos(true);
      timer = setTimeout(() => setVisible(true), 4000);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // private mode: it simply shows again next visit
    }
  };

  const install = async () => {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    setEvent(null);
    if (choice.outcome === "accepted") setVisible(false);
    else dismiss();
  };

  if (!visible || (!event && !ios)) return null;

  return (
    <div className={styles.card} role="dialog" aria-label="Install InstituteSathi">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className={styles.icon} />
      <div className={styles.body}>
        <p className={styles.title}>Install InstituteSathi</p>
        {ios ? (
          <p className={styles.text}>
            Tap the <strong>Share</strong> button, then <strong>Add to Home Screen</strong>.
          </p>
        ) : (
          <p className={styles.text}>Add it to your home screen to open it like an app.</p>
        )}
      </div>
      <div className={styles.actions}>
        {!ios && (
          <button type="button" className={styles.install} onClick={install}>
            Install
          </button>
        )}
        <button type="button" className={styles.later} onClick={dismiss}>
          {ios ? "Got it" : "Not now"}
        </button>
      </div>
    </div>
  );
}
