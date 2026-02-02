import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./auth.css";

export default function Login({ close }) {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (Array.isArray(data.detail)) {
          setError(data.detail[0].msg);
        } else {
          setError(data.detail || "Login failed");
        }
        return;
      }

      login(data.access_token);

      close();
    } catch {
      setError("Server not reachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={close}>
      <div className="auth-card" onClick={(e) => e.stopPropagation()}>
        <h2>Login</h2>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "10px" }}>
          Login to unlock unlimited bias analysis and rewrites.
        </p>

        {error && <p className="auth-error">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleLogin} disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <button
          className="link"
          onClick={() => window.dispatchEvent(new Event("open-forgot"))}
        >
          Forgot Password?
        </button>

        <button className="link" onClick={close}>
          Back to Home
        </button>
      </div>
    </div>
  );
}
