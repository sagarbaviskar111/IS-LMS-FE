"use client";

import { useAuth } from "@/context/AuthContext";
import AdminOverview from "./AdminOverview";
import SubadminHome from "./SubadminHome";

export default function AdminHome() {
  const { user } = useAuth();
  return user?.subadmin ? <SubadminHome /> : <AdminOverview />;
}
