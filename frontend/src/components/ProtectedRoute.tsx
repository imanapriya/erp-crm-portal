import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types";

export function ProtectedRoute({ children, allow }: { children: ReactNode; allow?: UserRole[] }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allow && !allow.includes(user.role)) {
    return (
      <div className="empty-state">
        <div className="headline">You don't have access to this page</div>
        <div>Your role ({user.role}) doesn't include this section.</div>
      </div>
    );
  }
  return <>{children}</>;
}
