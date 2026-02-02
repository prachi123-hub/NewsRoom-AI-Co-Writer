import { useState } from "react";
import "./auth.css";

export default function ForgotPassword({ close, openReset }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleContinue = () => {
    if (!username) {
      setError("Username is required");
      return;
    }

    close();
    openReset(username);
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <h2>Forgot Password</h2>

        {error && <p className="auth-error">{error}</p>}

        <input
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <button onClick={handleContinue}>Continue</button>

        <button className="link" onClick={close}>
          Back to Home
        </button>
      </div>
    </div>
  );
}
