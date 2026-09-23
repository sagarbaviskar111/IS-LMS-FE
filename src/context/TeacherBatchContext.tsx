"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, Batch } from "@/lib/api";

interface TeacherBatchContextValue {
  batches: Batch[];
  loading: boolean;
  activeBatchId: string | null;
  activeBatch: Batch | null;
  selectBatch: (id: string) => void;
}

const TeacherBatchContext = createContext<TeacherBatchContextValue | undefined>(undefined);

const storageKey = (teacherId: string) => `activeBatch:${teacherId}`;

export function TeacherBatchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    api
      .myBatches()
      .then((res) => {
        setBatches(res.batches);

        let stored: string | null = null;
        try {
          stored = localStorage.getItem(storageKey(user._id));
        } catch {
          // localStorage unavailable — ignore
        }

        const validStored = stored && res.batches.some((b) => b._id === stored) ? stored : null;

        if (validStored) {
          setActiveBatchId(validStored);
        } else if (res.batches.length === 1) {
          setActiveBatchId(res.batches[0]._id);
        }
      })
      .finally(() => setLoading(false));
  }, [user]);

  const selectBatch = (id: string) => {
    setActiveBatchId(id);
    if (user) {
      try {
        localStorage.setItem(storageKey(user._id), id);
      } catch {
        // localStorage unavailable — ignore
      }
    }
  };

  const activeBatch = batches.find((b) => b._id === activeBatchId) || null;

  return (
    <TeacherBatchContext.Provider value={{ batches, loading, activeBatchId, activeBatch, selectBatch }}>
      {children}
    </TeacherBatchContext.Provider>
  );
}

export function useTeacherBatch() {
  const ctx = useContext(TeacherBatchContext);
  if (!ctx) throw new Error("useTeacherBatch must be used within TeacherBatchProvider");
  return ctx;
}
