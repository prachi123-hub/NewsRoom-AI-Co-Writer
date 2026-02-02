import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p style={{ textAlign: "center" }}>Checking access...</p>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
