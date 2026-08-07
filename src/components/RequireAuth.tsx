import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

/**
 * Gates a route behind a signed-in session.
 *
 * This is convenience, not security -- anyone can edit client state, and the
 * real enforcement is row level security in the database, which returns nothing
 * to an unauthenticated caller. What this prevents is a signed-out visitor
 * landing on a broken-looking empty dashboard.
 */
const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();
  const location = useLocation();

  // Restoring a session from storage is asynchronous. Redirecting during that
  // window would bounce a signed-in user to the login screen on every refresh.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!session) {
    // Remember where they were headed so login can send them back there.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default RequireAuth;
