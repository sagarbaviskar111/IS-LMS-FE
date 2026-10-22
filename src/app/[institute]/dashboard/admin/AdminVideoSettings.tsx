"use client";

import { useEffect, useState } from "react";
import { api, VideoFlow } from "@/lib/api";
import adminStyles from "./admin.module.css";
import AdminYoutubeSettings from "./AdminYoutubeSettings";
import AdminStorageSettings from "./AdminStorageSettings";

// The superadmin decides per institute whether recordings go to YouTube or to
// the institute's own storage server; this just shows the matching wizard.
export default function AdminVideoSettings() {
  const [flow, setFlow] = useState<VideoFlow | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .getStorageStatus()
      .then((s) => setFlow(s.flow))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return <p className={adminStyles.messageError}>Couldn&apos;t load your video settings — refresh and try again.</p>;
  if (!flow) return <p className={adminStyles.empty}>Loading...</p>;
  return flow === "storage" ? <AdminStorageSettings /> : <AdminYoutubeSettings />;
}
