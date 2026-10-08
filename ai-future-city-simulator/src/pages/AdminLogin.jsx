import React from "react";
import { Link } from "react-router-dom";
import BrandMark from "../components/common/BrandMark";

export default function AdminLogin() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <section className="mx-auto max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-8 text-center">
        <BrandMark className="mx-auto mb-4 h-12 w-12" />
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">YUG NIRMAN · Public Demo</p>
        <h1 className="mt-3 text-2xl font-bold">Admin access is disabled</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          This public demo does not provide accounts or administrative controls.
        </p>
        <Link to="/dashboard" className="mt-6 inline-flex rounded-lg bg-cyan-500 px-5 py-3 font-semibold text-slate-950">
          Open the public demo
        </Link>
      </section>
    </main>
  );
}
