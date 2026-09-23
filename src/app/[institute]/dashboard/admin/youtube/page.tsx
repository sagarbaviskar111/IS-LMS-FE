import { Suspense } from "react";
import AdminYoutubeSettings from "../AdminYoutubeSettings";

export default function AdminYoutubePage() {
  return (
    <Suspense fallback={null}>
      <AdminYoutubeSettings />
    </Suspense>
  );
}
