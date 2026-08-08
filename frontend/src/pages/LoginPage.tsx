import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/client";

const DEMO_ACCOUNTS = [
  { role: "ADMIN", email: "admin@erpcrm.test" },
  { role: "SALES", email: "sales@erpcrm.test" },
  { role: "WAREHOUSE", email: "warehouse@erpcrm.test" },
  { role: "ACCOUNTS", email: "accounts@erpcrm.test" },
];

export function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(apiErrorMessage(err, "Invalid email or password"));
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <div className="mark">LEDGER</div>
          <div className="tag">Mini ERP + CRM Operations Portal</div>
        </div>

        {error && <div className="banner banner-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? <span className="spinner-inline" /> : "Sign in"}
          </button>
        </form>

        <div className="login-demo-creds">
          <div style={{ marginBottom: 6, fontWeight: 600, color: "var(--ink-soft)" }}>Demo accounts (after seeding)</div>
          {DEMO_ACCOUNTS.map((acc) => (
            <div className="row" key={acc.role}>
              <span className="role">{acc.role}</span>
              <span>{acc.email}</span>
            </div>
          ))}
          <div className="row" style={{ marginTop: 4 }}>
            <span>Password for all</span>
            <span className="mono">Password123!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
