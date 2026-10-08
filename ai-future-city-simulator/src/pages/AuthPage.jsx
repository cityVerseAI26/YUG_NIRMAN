import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CircleAlert, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AuthPage({ adminOnly = false, initialMode = "login" }) {
  const navigate = useNavigate();
  const { currentUser, authLoading, loginUser, loginAdmin, registerUser, resetUserPassword } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && currentUser) {
      navigate(currentUser.authType === "admin" ? "/admin-dashboard" : "/dashboard", { replace: true });
    }
  }, [authLoading, currentUser, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    let result;
    if (mode === "register") {
      result = await registerUser(name, email, "", password);
    } else if (mode === "reset") {
      result = await resetUserPassword(email);
    } else {
      result = adminOnly ? await loginAdmin(email, password) : await loginUser(email, password);
    }
    setSubmitting(false);
    if (!result.success) {
      setError(result.message || "Please try again.");
      return;
    }
    if (mode === "register") {
      setMode("login");
      setPassword("");
      setConfirmPassword("");
      setNotice("Account created. Sign in with your new account.");
      return;
    }
    if (mode === "reset") {
      setNotice("If an account exists for that email, Firebase has sent a password reset link.");
      return;
    }
    navigate(adminOnly ? "/admin-dashboard" : "/dashboard", { replace: true });
  };

  const title = adminOnly ? "Administrator sign in" : mode === "register" ? "Create your account" : mode === "reset" ? "Reset your password" : "Welcome back";
  const description = adminOnly ? "Sign in with an authorized Firebase administrator account." : mode === "register" ? "Create a secure account for your city workspace." : mode === "reset" ? "We will email you a password reset link." : "Sign in to continue to your city workspace.";

  if (authLoading) return <main className="min-h-screen grid place-items-center bg-slate-950 text-slate-200" role="status">Restoring your secure session…</main>;

  return (
    <main className="min-h-screen grid bg-slate-950 text-slate-100 lg:grid-cols-2">
      <section className="relative hidden min-h-screen overflow-hidden border-r border-white/10 bg-gradient-to-br from-emerald-950 via-slate-950 to-cyan-950 p-12 lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="text-sm font-semibold tracking-[0.2em] text-teal-200">YUG NIRMAN <span className="block pt-1 text-[10px] font-normal tracking-[0.24em] text-slate-400">CITY SIMULATOR · URBAN INTELLIGENCE</span></Link>
        <div className="max-w-lg">
          <p className="mb-4 text-xs font-semibold tracking-[0.24em] text-teal-300">{adminOnly ? "AUTHORIZED PERSONNEL" : "CONNECTED CITY INTELLIGENCE"}</p>
          <h1 className="text-5xl font-semibold leading-tight">{adminOnly ? "Steward the city." : "See the city as a living system."}</h1>
          <p className="mt-5 max-w-md text-lg leading-8 text-slate-300">Explore urban signals, compare planning scenarios, and shape a more resilient future.</p>
        </div>
        <p className="text-xs tracking-widest text-slate-400">MOBILITY · ENERGY · WATER · CLIMATE</p>
      </section>
      <section className="grid min-h-screen place-items-center p-6 sm:p-10">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-7 shadow-2xl sm:p-10">
          <Link to="/" className="mb-8 inline-block text-sm text-teal-300 hover:text-teal-200 lg:hidden">YUG NIRMAN</Link>
          <p className="text-xs font-semibold tracking-[0.2em] text-teal-300">{adminOnly ? "ADMIN PORTAL" : "YOUR CITY WORKSPACE"}</p>
          <h2 className="mt-3 text-3xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {mode === "register" && <label className="block text-sm font-medium">Full name<div className="relative mt-2"><UserRound className="absolute left-3 top-3.5 text-slate-500" size={18}/><input className="w-full rounded-xl border border-white/10 bg-slate-950 py-3 pl-10 pr-3 outline-none focus:border-teal-400" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></div></label>}
            <label className="block text-sm font-medium">Email<div className="relative mt-2"><Mail className="absolute left-3 top-3.5 text-slate-500" size={18}/><input className="w-full rounded-xl border border-white/10 bg-slate-950 py-3 pl-10 pr-3 outline-none focus:border-teal-400" type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></label>
            {mode !== "reset" && <label className="block text-sm font-medium">Password<div className="relative mt-2"><LockKeyhole className="absolute left-3 top-3.5 text-slate-500" size={18}/><input className="w-full rounded-xl border border-white/10 bg-slate-950 py-3 pl-10 pr-3 outline-none focus:border-teal-400" type="password" name="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /></div></label>}
            {mode === "register" && <label className="block text-sm font-medium">Confirm password<input className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 outline-none focus:border-teal-400" type="password" autoComplete="new-password" minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>}
            {error && <p className="flex gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200" role="alert"><CircleAlert size={18} className="shrink-0"/>{error}</p>}
            {notice && <p className="rounded-xl border border-teal-400/30 bg-teal-400/10 p-3 text-sm text-teal-100" role="status">{notice}</p>}
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-teal-200 disabled:cursor-wait disabled:opacity-60" type="submit" disabled={submitting}>
              {submitting ? "Please wait…" : mode === "register" ? "Create account" : mode === "reset" ? "Send reset link" : adminOnly ? "Enter admin workspace" : "Sign in"}{!submitting && <ArrowRight size={18}/>}
            </button>
          </form>
          <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm text-slate-400">
            {!adminOnly && mode === "login" && <button className="hover:text-teal-200" onClick={() => { setMode("reset"); setError(""); setNotice(""); }}>Forgot password?</button>}
            {!adminOnly && <button className="hover:text-teal-200" onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); setNotice(""); }}>{mode === "register" ? "Already have an account? Sign in" : "Create an account"}</button>}
          </div>
          <div className="mt-8 border-t border-white/10 pt-5 text-sm text-slate-400">
            {adminOnly ? <Link className="hover:text-teal-200" to="/login">User sign in</Link> : <Link className="hover:text-teal-200" to="/admin-login">Administrator sign in</Link>}
            <span className="mx-3 text-slate-600">·</span><Link className="hover:text-teal-200" to="/">Back to home</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
