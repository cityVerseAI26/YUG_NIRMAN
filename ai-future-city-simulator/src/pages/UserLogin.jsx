import React, { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowRight, Check, CircleAlert, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import BrandMark from "../components/common/BrandMark";
import { useAuth } from "../context/AuthContext";

const PHONE_COUNTRIES = [
  { name: "United States", code: "+1" },
  { name: "Canada", code: "+1" },
  { name: "Mexico", code: "+52" },
  { name: "Brazil", code: "+55" },
  { name: "Argentina", code: "+54" },
  { name: "Chile", code: "+56" },
  { name: "Colombia", code: "+57" },
  { name: "United Kingdom", code: "+44" },
  { name: "Ireland", code: "+353" },
  { name: "France", code: "+33" },
  { name: "Germany", code: "+49" },
  { name: "Spain", code: "+34" },
  { name: "Italy", code: "+39" },
  { name: "Netherlands", code: "+31" },
  { name: "Belgium", code: "+32" },
  { name: "Switzerland", code: "+41" },
  { name: "Austria", code: "+43" },
  { name: "Sweden", code: "+46" },
  { name: "Norway", code: "+47" },
  { name: "Denmark", code: "+45" },
  { name: "Finland", code: "+358" },
  { name: "Poland", code: "+48" },
  { name: "Portugal", code: "+351" },
  { name: "Greece", code: "+30" },
  { name: "Turkey", code: "+90" },
  { name: "Ukraine", code: "+380" },
  { name: "Russia", code: "+7" },
  { name: "India", code: "+91" },
  { name: "Pakistan", code: "+92" },
  { name: "Bangladesh", code: "+880" },
  { name: "Sri Lanka", code: "+94" },
  { name: "Nepal", code: "+977" },
  { name: "China", code: "+86" },
  { name: "Japan", code: "+81" },
  { name: "South Korea", code: "+82" },
  { name: "Singapore", code: "+65" },
  { name: "Malaysia", code: "+60" },
  { name: "Indonesia", code: "+62" },
  { name: "Philippines", code: "+63" },
  { name: "Thailand", code: "+66" },
  { name: "Vietnam", code: "+84" },
  { name: "Hong Kong", code: "+852" },
  { name: "Taiwan", code: "+886" },
  { name: "United Arab Emirates", code: "+971" },
  { name: "Saudi Arabia", code: "+966" },
  { name: "Qatar", code: "+974" },
  { name: "Israel", code: "+972" },
  { name: "Egypt", code: "+20" },
  { name: "South Africa", code: "+27" },
  { name: "Nigeria", code: "+234" },
  { name: "Kenya", code: "+254" },
  { name: "Australia", code: "+61" },
  { name: "New Zealand", code: "+64" },
];

export default function UserLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginUser, registerUser, resetUserPassword } = useAuth();

  const [form, setForm]     = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [error, setError]   = useState("");
  const [successMessage, setSuccessMessage] = useState(() => (
    location.state?.accountDeleted ? "Your account and saved user data were successfully deleted." : ""
  ));
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [phoneCountry, setPhoneCountry] = useState("");

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
    setSuccessMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if ((isRegistering || isResetting) && !phoneCountry) {
      setError("Choose your country before entering your phone number.");
      return;
    }
    const countryCode = PHONE_COUNTRIES.find((country) => country.name === phoneCountry)?.code || "";
    const internationalPhone = `${countryCode}${form.phone.replace(/\D/g, "")}`;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 700)); // simulate async
    let result;
    if ((isRegistering || isResetting) && form.password !== form.confirmPassword) {
      setLoading(false);
      setError("Passwords do not match.");
      return;
    }
    if (isRegistering) {
      result = registerUser(form.name, form.email, internationalPhone, form.password);
    } else if (isResetting) {
      result = resetUserPassword(form.email, internationalPhone, form.password);
    } else {
      result = loginUser(form.email, form.password);
    }
    setLoading(false);
    if (result.success) {
      if (isRegistering) {
        setIsRegistering(false);
        setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
        setShowPass(false);
        setSuccessMessage("Registration complete. Please log in with your new account.");
        return;
      }
      if (isResetting) {
        setIsResetting(false);
        setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
        setShowPass(false);
        setSuccessMessage("Password updated. Sign in with your new password.");
        return;
      }
      navigate("/select-city", {
        replace: true,
        state: location.state?.from ? { from: location.state.from } : undefined,
      });
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="auth-root auth-root-user">
      <div className="auth-grid" aria-hidden="true" />

      <aside className="auth-visual" aria-label="YUG NIRMAN city simulator">
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
          <span className="auth-live-tag"><span />CITY SYSTEMS</span>
        </header>

        <div className="auth-visual-copy">
          <p className="auth-visual-kicker">CONNECTED CITY INTELLIGENCE</p>
          <h1>See the city<br /><span>as a living system.</span></h1>
          <p>Explore urban signals, compare planning scenarios, and shape a more resilient future.</p>
        </div>

        <footer className="auth-visual-footer">
          <span>Mobility · Energy · Water · Climate</span>
          <span>YUG NIRMAN / 2026</span>
        </footer>
      </aside>

      <main className="auth-panel">
        <div className="auth-card auth-card-user">
          <div className="auth-form-heading">
            <p className="auth-form-eyebrow">YOUR CITY WORKSPACE</p>
            <h2 className="auth-title">{isRegistering ? "Create your account" : isResetting ? "Reset your password" : "Welcome back"}</h2>
            <p className="auth-subtitle">
              {isRegistering
                ? "Create an account to begin exploring YUG NIRMAN."
                : isResetting
                  ? "Confirm the phone number saved to your account. This browser-only reset does not send an SMS code."
                  : "Sign in to continue to your city dashboard."}
            </p>
          </div>

        {!isRegistering && !isResetting && (
          <button
            type="button"
            className="auth-link auth-forgot-link"
            onClick={() => { setIsResetting(true); setError(""); setSuccessMessage(""); }}
          >
            Forgot password?
          </button>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {isRegistering && (
            <div className="auth-field">
              <label htmlFor="user-name" className="auth-label">Full Name</label>
              <div className="auth-input-wrap">
                <UserRound className="auth-input-icon" size={17} aria-hidden="true" />
                <input
                  id="user-name"
                  type="text"
                  name="name"
                  placeholder="Your name"
                  value={form.name}
                  onChange={handleChange}
                  className="auth-input"
                  required
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          {/* email */}
          <div className="auth-field">
            <label htmlFor="user-email" className="auth-label">Email Address</label>
            <div className="auth-input-wrap">
                <Mail className="auth-input-icon" size={17} aria-hidden="true" />
              <input
                id="user-email"
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                className="auth-input"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {(isRegistering || isResetting) && (
            <div className="auth-field">
              <label htmlFor="user-phone" className="auth-label">Phone Number</label>
              <div className="auth-phone-fields">
                <select
                  id="user-phone-country"
                  value={phoneCountry}
                  onChange={(event) => { setPhoneCountry(event.target.value); setError(""); }}
                  className="auth-phone-country"
                  aria-label="Choose your country calling code"
                  required
                >
                  <option value="">Choose country</option>
                  {PHONE_COUNTRIES.map((country) => (
                    <option key={country.name} value={country.name}>{country.name} ({country.code})</option>
                  ))}
                </select>
                <div className="auth-input-wrap">
                  <Phone className="auth-input-icon" size={17} aria-hidden="true" />
                  <input
                    id="user-phone"
                    type="tel"
                    name="phone"
                    placeholder={phoneCountry ? "Phone number" : "Choose country first"}
                    value={form.phone}
                    onChange={handleChange}
                    className="auth-input"
                    required
                    disabled={!phoneCountry}
                    autoComplete="tel-national"
                    inputMode="tel"
                  />
                </div>
              </div>
            </div>
          )}

          {/* password */}
          <div className="auth-field">
            <label htmlFor="user-password" className="auth-label">{isResetting ? "New Password" : "Password"}</label>
            <div className="auth-input-wrap">
                <LockKeyhole className="auth-input-icon" size={17} aria-hidden="true" />
              <input
                id="user-password"
                type={showPass ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                className="auth-input"
                required
                autoComplete={isRegistering || isResetting ? "new-password" : "current-password"}
                minLength={isRegistering || isResetting ? 8 : undefined}
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPass((v) => !v)}
                aria-label="Toggle password visibility"
              >
                {showPass ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
          </div>

          {(isRegistering || isResetting) && (
            <div className="auth-field">
              <label htmlFor="user-confirm-password" className="auth-label">Confirm Password</label>
              <div className="auth-input-wrap">
                <LockKeyhole className="auth-input-icon" size={17} aria-hidden="true" />
                <input
                  id="user-confirm-password"
                  type="password"
                  name="confirmPassword"
                  placeholder="Re-enter your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  className="auth-input"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {/* error */}
          {error && (
            <div className="auth-error" role="alert">
              <CircleAlert size={17} aria-hidden="true" />{error}
            </div>
          )}
          {successMessage && (
            <div className="auth-success" role="status">
              <Check size={17} aria-hidden="true" />{successMessage}
            </div>
          )}

          {/* submit */}
          <button
            id="btn-user-submit"
            type="submit"
            className="auth-submit auth-submit-user"
            disabled={loading}
          >
            {loading ? <span className="auth-spinner" /> : null}
            {loading
              ? (isRegistering ? "Creating Account…" : "Authenticating…")
              : (isRegistering ? "Create account" : isResetting ? "Reset password" : "Sign in to dashboard")}
            {!loading && <ArrowRight size={17} aria-hidden="true" />}
          </button>
        </form>

        <div className="auth-footer-links auth-footer-links-user">
          <Link to="/" className="auth-link">Back to home</Link>
          {isResetting ? (
            <button
              type="button"
              className="auth-link auth-mode-toggle"
              onClick={() => { setIsResetting(false); setError(""); setSuccessMessage(""); }}
            >
              Back to sign in
            </button>
          ) : (
            <button
              type="button"
              className="auth-link auth-mode-toggle"
              onClick={() => {
                setIsRegistering((current) => !current);
                setError("");
                setSuccessMessage("");
              }}
            >
              {isRegistering ? "Already registered? Sign in" : "New to YUG NIRMAN? Create an account"}
            </button>
          )}
          <Link to="/admin-login" className="auth-link auth-link-admin">Admin sign in</Link>
        </div>
        </div>
      </main>
    </div>
  );
}
