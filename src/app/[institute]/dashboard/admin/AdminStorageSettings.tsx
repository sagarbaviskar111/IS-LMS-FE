"use client";

import { useEffect, useState } from "react";
import { api, ApiError, StorageProvider, StorageStatus } from "@/lib/api";
import adminStyles from "./admin.module.css";
import styles from "./VideoWizard.module.css";
import WizardSteps, { WizardStep } from "./WizardSteps";

const PROVIDER_LABEL: Record<StorageProvider, string> = {
  s3: "AWS S3",
  r2: "Cloudflare R2",
};

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className={styles.openLink} href={href} target="_blank" rel="noreferrer">
      {children} ↗
    </a>
  );
}

function CopyBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — admin can still select the text by hand
    }
  };
  return (
    <div style={{ margin: "8px 0" }}>
      <pre className={`${adminStyles.linkBox} ${styles.mono}`} style={{ whiteSpace: "pre-wrap", margin: "0 0 6px" }}>
        {text}
      </pre>
      <button type="button" className={adminStyles.smallButton} onClick={copy}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

const s3Policy = (bucket: string) =>
  JSON.stringify(
    {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
          Resource: `arn:aws:s3:::${bucket}/*`,
        },
        { Effect: "Allow", Action: ["s3:ListBucket"], Resource: `arn:aws:s3:::${bucket}` },
      ],
    },
    null,
    2
  );

export default function AdminStorageSettings() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<StorageProvider | null>(null);
  const [step, setStep] = useState(0);
  const [showWizard, setShowWizard] = useState(false);

  const [accountId, setAccountId] = useState("");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [bucket, setBucket] = useState("");
  const [region, setRegion] = useState("");

  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = () => {
    api
      .getStorageStatus()
      .then(setStatus)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const pickProvider = (p: StorageProvider) => {
    setProvider(p);
    setMessage(null);
    setStep(1);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) return;
    setMessage(null);
    setSaving(true);
    try {
      const res = await api.saveStorageConfig({
        provider,
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        bucket: bucket.trim(),
        ...(provider === "s3" ? { region: region.trim() } : { accountId: accountId.trim() }),
      });
      setMessage({ type: "success", text: res.message });
      setSecretAccessKey("");
      setShowWizard(false);
      load();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Could not connect — try again." });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Disconnect this storage server? Teachers can't upload new recordings until you set one up again. Existing recordings stay in your bucket.")) {
      return;
    }
    setRemoving(true);
    try {
      await api.removeStorageConfig();
      setMessage({ type: "success", text: "Storage server disconnected." });
      setProvider(null);
      setStep(0);
      load();
    } catch {
      setMessage({ type: "error", text: "Couldn't disconnect — try again." });
    } finally {
      setRemoving(false);
    }
  };

  if (loading) return <p className={adminStyles.empty}>Loading...</p>;

  const verified = !!status?.verified;

  const chooseStep: WizardStep = {
    title: "Choose where to store recordings",
    done: !!provider,
    hideNext: true,
    content: (
      <div className={styles.providerRow}>
        {(["s3", "r2"] as StorageProvider[]).map((p) => (
          <button
            key={p}
            type="button"
            className={`${styles.providerCard} ${provider === p ? styles.providerCardActive : ""}`}
            onClick={() => pickProvider(p)}
          >
            <div className={styles.providerName}>{PROVIDER_LABEL[p]}</div>
            <div className={styles.providerHint}>
              {p === "s3"
                ? "Amazon's storage. Pay for storage and for data watched."
                : "Cloudflare's storage. Storage is cheap and watching videos costs nothing extra."}
            </div>
          </button>
        ))}
      </div>
    ),
  };

  const connectStep: WizardStep = {
    title: "Enter your keys and test",
    done: verified,
    hideNext: true,
    content: (
      <form className={adminStyles.form} onSubmit={submit}>
        {provider === "r2" && (
          <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
            Cloudflare Account ID
            <input
              className={adminStyles.input}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="32 letters/numbers from the R2 overview page"
              required
            />
          </label>
        )}
        <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
          Access Key ID
          <input
            className={adminStyles.input}
            value={accessKeyId}
            onChange={(e) => setAccessKeyId(e.target.value)}
            autoComplete="off"
            required
          />
        </label>
        <label className={adminStyles.label} style={{ gridColumn: "1 / -1" }}>
          Secret Access Key
          <input
            className={adminStyles.input}
            type="password"
            value={secretAccessKey}
            onChange={(e) => setSecretAccessKey(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <label className={adminStyles.label}>
          Bucket name
          <input className={adminStyles.input} value={bucket} onChange={(e) => setBucket(e.target.value)} required />
        </label>
        {provider === "s3" && (
          <label className={adminStyles.label}>
            Region
            <input
              className={adminStyles.input}
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. ap-south-1"
              required
            />
          </label>
        )}
        <div className={adminStyles.formActions}>
          <button className={adminStyles.primaryButton} type="submit" disabled={saving}>
            {saving ? "Testing connection..." : "Test & save"}
          </button>
          <button type="button" className={adminStyles.smallButton} onClick={() => setStep(step - 1)}>
            Back
          </button>
        </div>
        <p className={adminStyles.sectionSubtitle} style={{ gridColumn: "1 / -1" }}>
          We write a tiny test file, read it back and delete it, so you know it works before any teacher uploads.
          Your secret key is stored encrypted and never shown again.
        </p>
      </form>
    ),
  };

  const providerSteps: WizardStep[] =
    provider === "s3"
      ? [
          {
            title: "Create a private bucket",
            content: (
              <>
                <p>A bucket is a folder in the cloud that holds your videos.</p>
                <ExternalLink href="https://s3.console.aws.amazon.com/s3/bucket/create">Open AWS — create bucket</ExternalLink>
                <ol>
                  <li>Sign in (or create a free AWS account).</li>
                  <li>Pick a <strong>bucket name</strong> (e.g. <code>my-institute-recordings</code>) and note it down.</li>
                  <li>
                    Pick the <strong>region</strong> closest to your students (e.g. Mumbai = <code>ap-south-1</code>) and
                    note the code.
                  </li>
                  <li>Leave <strong>Block all public access</strong> ticked — videos play through secure, expiring links.</li>
                  <li>Click <strong>Create bucket</strong>.</li>
                </ol>
              </>
            ),
          },
          {
            title: "Create an access key",
            content: (
              <>
                <ExternalLink href="https://console.aws.amazon.com/iam/home#/users">Open AWS — users</ExternalLink>
                <ol>
                  <li>Click <strong>Create user</strong>, name it <code>recordings-app</code>, click Next.</li>
                  <li>
                    Choose <strong>Attach policies directly</strong> → <strong>Create policy</strong> → the <strong>JSON</strong>{" "}
                    tab, and paste this (replace <code>YOUR-BUCKET-NAME</code> if you haven&apos;t typed your bucket below):
                  </li>
                </ol>
                <label className={adminStyles.label} style={{ maxWidth: 360 }}>
                  Your bucket name
                  <input
                    className={adminStyles.input}
                    value={bucket}
                    onChange={(e) => setBucket(e.target.value)}
                    placeholder="my-institute-recordings"
                  />
                </label>
                <CopyBox text={s3Policy(bucket.trim() || "YOUR-BUCKET-NAME")} />
                <ol start={3}>
                  <li>Save the policy, attach it to the user, and finish creating the user.</li>
                  <li>
                    Open the user → <strong>Security credentials</strong> → <strong>Create access key</strong> →{" "}
                    <em>Application running outside AWS</em>.
                  </li>
                  <li>Copy the <strong>Access key</strong> and <strong>Secret access key</strong> — the secret is shown only once.</li>
                </ol>
              </>
            ),
          },
          connectStep,
        ]
      : provider === "r2"
        ? [
            {
              title: "Create a private bucket",
              content: (
                <>
                  <ExternalLink href="https://dash.cloudflare.com/?to=/:account/r2/new">Open Cloudflare — create bucket</ExternalLink>
                  <ol>
                    <li>Sign in (or create a free Cloudflare account). R2 asks for a card on file but has a free tier.</li>
                    <li>Choose a <strong>bucket name</strong> (e.g. <code>my-institute-recordings</code>) and note it down.</li>
                    <li>Click <strong>Create bucket</strong>. Leave public access off.</li>
                  </ol>
                </>
              ),
            },
            {
              title: "Create an access key",
              content: (
                <>
                  <ExternalLink href="https://dash.cloudflare.com/?to=/:account/r2/api-tokens">Open Cloudflare — API tokens</ExternalLink>
                  <ol>
                    <li>On the R2 overview page, copy your <strong>Account ID</strong> (right side) — you&apos;ll paste it next.</li>
                    <li>Click <strong>Manage API tokens</strong> → <strong>Create API token</strong>.</li>
                    <li>
                      Permission: <strong>Object Read &amp; Write</strong>. Apply to: <strong>specific bucket</strong> → pick
                      yours.
                    </li>
                    <li>Click <strong>Create</strong>, then copy the <strong>Access Key ID</strong> and <strong>Secret Access Key</strong> — the secret is shown only once.</li>
                  </ol>
                </>
              ),
            },
            connectStep,
          ]
        : [];

  const steps: WizardStep[] = [chooseStep, ...providerSteps];

  return (
    <div>
      <section className={adminStyles.section} style={{ marginBottom: 16 }}>
        <div className={adminStyles.sectionHead}>
          <div>
            <h2 className={adminStyles.sectionTitle}>Recordings → your own storage server</h2>
            <p className={adminStyles.sectionSubtitle}>
              Teachers&apos; session recordings are stored in a private bucket that belongs to you, and students watch
              them through secure links that expire.
            </p>
          </div>
        </div>
        {verified ? (
          <div>
            <p style={{ marginBottom: 4 }}>
              <span className={adminStyles.badgeSuccess}>Connected</span>
            </p>
            <p style={{ marginBottom: 4 }}>
              {status?.provider ? PROVIDER_LABEL[status.provider] : "Storage"} · bucket <strong>{status?.bucket}</strong>
              {status?.provider === "s3" && status?.region ? ` · ${status.region}` : ""}
            </p>
            <p style={{ color: "var(--muted)", marginBottom: 16 }}>Access Key ID: {status?.accessKeyId}</p>
            <div className={styles.nav} style={{ marginTop: 0 }}>
              <button className={adminStyles.smallButton} onClick={() => setShowWizard((v) => !v)}>
                {showWizard ? "Hide setup steps" : "Change keys / server"}
              </button>
              <button className={adminStyles.dangerButton} onClick={remove} disabled={removing}>
                {removing ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: 4 }}>
              <span className={adminStyles.badgeInactive}>Not set up</span>
            </p>
            <p style={{ color: "var(--muted)" }}>
              Teachers can&apos;t upload recordings until you finish the steps below (about 10 minutes).
            </p>
          </div>
        )}
      </section>

      {(!verified || showWizard) && (
        <section className={adminStyles.section}>
          <WizardSteps steps={steps} current={step} onChange={setStep} />
        </section>
      )}

      {message && (
        <p className={message.type === "error" ? adminStyles.messageError : adminStyles.messageSuccess} style={{ marginTop: 12 }}>
          {message.text}
        </p>
      )}
    </div>
  );
}
