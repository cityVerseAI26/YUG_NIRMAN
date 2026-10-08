import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, CircleAlert, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import BrandMark from "../components/common/BrandMark";
import { ADMINS, useAuth } from "../context/AuthContext";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();

  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const result = loginAdmin(form.email, form.password);
    setLoading(false);
    if (result.success) {
      navigate("/admin-dashboard");
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="auth-root auth-root-user auth-root-admin">
      <div className="auth-grid" aria-hidden="true" />

      <aside className="auth-visual" aria-label="YUG NIRMAN administration">
        <img
          className="auth-visual-image"
          src="https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/South_Korea%2C_Incheon%2C_Songdo%2C_the_Sharp_Central_Park_Towers.jpg/1280px-South_Korea%2C_Incheon%2C_Songdo%2C_the_Sharp_Central_Park_Towers.jpg"
          alt=""
        />
        <div className="auth-visual-shade" aria-hidden="true" />
        <header className="auth-visual-top">
          <Link to="/" className="auth-visual-brand" aria-label="YUG NIRMAN home">
            <span className="auth-visual-mark"><BrandMark className="h-7 w-7" /></span>
            <span className="auth-visual-brand-copy">
              <strong>YUG NIRMAN</strong>
              <small>CITY SIMULATOR · URBAN INTELLIGENCE</small>
            </span>
          </Link>
          <span className="auth-live-tag auth-live-tag-admin"><span />ADMIN PORTAL</span>
        </header>

        <div className="auth-visual-copy">
          <p className="auth-visual-kicker">ADMINISTRATOR ACCESS</p>
          <h1>Steward the city.<br /><span>Shape what comes next.</span></h1>
          <p>A secure workspace for the people keeping YUG NIRMAN’s city intelligence moving.</p>
        </div>

        <footer className="auth-visual-footer">
          <span>Mobility · Energy · Water · Climate</span>
          <span>YUG NIRMAN / ADMIN</span>
        </footer>
      </aside>

      <main className="auth-panel">
        <div className="auth-card auth-card-user auth-card-admin">
          <div className="auth-form-heading">
            <p className="auth-form-eyebrow">AUTHORIZED PERSONNEL</p>
            <h2 className="auth-title">Admin sign in</h2>
            <p className="auth-subtitle">Access the city operations workspace.</p>
          </div>

          <section className="auth-admin-roster" aria-labelledby="auth-admin-roster-title">
            <div className="auth-admin-roster-heading">
              <h3 id="auth-admin-roster-title">Authorized admins</h3>
              <span>{ADMINS.length} accounts</span>
            </div>
            <ul className="auth-admin-roster-list">
              {ADMINS.map((admin) => (
                <li key={admin.id}>
                  <span className="auth-admin-initials" aria-hidden="true">{admin.avatar}</span>
                  <span className="auth-admin-identity">
                    <strong>{admin.name}</strong>
                    <small>{admin.role}</small>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="admin-email" className="auth-label">Admin email</label>
              <div className="auth-input-wrap">
                <Mail className="auth-input-icon" size={17} aria-hidden="true" />
                <input
                  id="admin-email"
                  type="email"
                  name="email"
                  placeholder="admin@example.com"
                  value={form.email}
                  onChange={handleChange}
                  className="auth-input"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="admin-password" className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <LockKeyhole className="auth-input-icon" size={17} aria-hidden="true" />
                <input
                  id="admin-password"
                  type={showPass ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  className="auth-input"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPass((value) => !value)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="auth-warning">
              <LockKeyhole size={15} aria-hidden="true" />
              Administrator access is restricted to authorized personnel.
            </div>

            {error && (
              <div className="auth-error" role="alert">
                <CircleAlert size={17} aria-hidden="true" />{error}
              </div>
            )}

            <button
              id="btn-admin-submit"
              type="submit"
              className="auth-submit auth-submit-user auth-submit-admin"
              disabled={loading}
            >
              {loading ? <span className="auth-spinner" /> : null}
              {loading ? "Verifying identity…" : "Enter admin workspace"}
              {!loading && <ArrowRight size={17} aria-hidden="true" />}
            </button>
          </form>

          <div className="auth-footer-links auth-footer-links-user">
            <Link to="/" className="auth-link">Back to home</Link>
            <Link to="/login" className="auth-link auth-link-admin">User sign in</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
