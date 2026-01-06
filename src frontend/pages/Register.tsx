import { useState } from "react";
import api from "../api/axios";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/auth/register", { email, password });
      alert("Registered successfully ✅ — now login");
    } catch {
      setError("Registration failed");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, #020617 0, #020617 40%, #020617 100%)",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
        color: "#e5e7eb",
        padding: "24px 12px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background:
            "linear-gradient(145deg, rgba(15,23,42,0.96), rgba(15,23,42,0.98))",
          borderRadius: 24,
          padding: "26px 26px 22px",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(15,23,42,0.9)",
          border: "1px solid rgba(148,163,184,0.55)",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
        }}
      >
        {/* Logo / title */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 16,
              background:
                "radial-gradient(circle at 30% 20%, #38bdf8, #4f46e5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ecfeff",
              fontWeight: 700,
              fontSize: 18,
              boxShadow: "0 16px 40px rgba(15,23,42,0.95)",
              border: "1px solid rgba(129,140,248,0.75)",
              marginBottom: 10,
            }}
          >
            C
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: 0.4,
            }}
          >
            Create Account
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "#9ca3af",
            }}
          >
            Join the conversation.
          </p>
        </div>

        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: 12 }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                fontSize: 12,
                marginBottom: 4,
                color: "#cbd5f5",
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 11px",
                borderRadius: 12,
                border: "1px solid rgba(51,65,85,0.9)",
                background:
                  "radial-gradient(circle at top left, #020617 0, #020617 50%, #020617 100%)",
                color: "#e5e7eb",
                fontSize: 14,
                outline: "none",
                boxShadow:
                  "inset 0 0 0 1px rgba(15,23,42,0.9), 0 0 0 0 rgba(0,0,0,0)",
              }}
            />
          </div>

          <div style={{ marginBottom: 4 }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                fontSize: 12,
                marginBottom: 4,
                color: "#cbd5f5",
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px 11px",
                borderRadius: 12,
                border: "1px solid rgba(51,65,85,0.9)",
                background:
                  "radial-gradient(circle at top left, #020617 0, #020617 50%, #020617 100%)",
                color: "#e5e7eb",
                fontSize: 14,
                outline: "none",
                boxShadow:
                  "inset 0 0 0 1px rgba(15,23,42,0.9), 0 0 0 0 rgba(0,0,0,0)",
              }}
            />
          </div>

          {error && (
            <p
              style={{
                color: "#f97373",
                fontSize: 12,
                marginTop: 6,
                marginBottom: 4,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            style={{
              marginTop: 12,
              width: "100%",
              borderRadius: 999,
              border: "none",
              padding: "10px 14px",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "inherit",
              background:
                "linear-gradient(135deg, #4f46e5, #7c3aed, #22c55e)",
              backgroundSize: "200% 200%",
              color: "#f9fafb",
              cursor: "pointer",
              boxShadow:
                "0 18px 46px rgba(79,70,229,0.7), 0 0 0 1px rgba(15,23,42,0.9)",
              textTransform: "uppercase",
              letterSpacing: 1.1,
              transition:
                "transform 120ms ease-out, box-shadow 120ms ease-out, background-position 220ms ease-out",
            }}
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
