import { useState } from "react";
import "./auth.css";

export default function ResetPassword({ username, close }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleReset = () => {
    if (!password || !confirm) {
      setError("All fields are required");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    alert(`Password reset successful for ${username}`);
    close();
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <h2>Reset Password</h2>

        {error && <p className="auth-error">{error}</p>}

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <button onClick={handleReset}>Reset Password</button>

        <button className="link" onClick={close}>
          Back to Home
        </button>
      </div>
    </div>
  );
}
