import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/lib/auth";
import { FullScreenLoader } from "@/components/FullScreenLoader";

/** Wraps a page so only authenticated users can see it. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  const [minElapsed, setMinElapsed] = useState(false);

  // Avoid an auth flash before Supabase restores the session — but cap the wait.
  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), 600);
    return () => clearTimeout(t);
  }, []);

  if (loading && !minElapsed) return <FullScreenLoader />;

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
