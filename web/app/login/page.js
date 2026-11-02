"use client";

import { useState } from "react";

export default function LoginPage() {
  const [Message, SetError] = useState("");
  const [Busy, SetBusy] = useState(false);

  async function HandleSubmit(Event) {
    Event.preventDefault();
    SetBusy(true);
    SetError("");
    const Form = new FormData(Event.currentTarget);
    try {
      const Result = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: Form.get("username"), password: Form.get("password") }),
      });
      const Data = await Result.json();
      if (!Result.ok) throw new Error(Data.message || "Sign-in failed");
      // Start a fresh document so cached pages cannot retain the previous account.
      window.location.replace(Data.role === "ADMIN" ? "/" : "/account");
    } catch (Failure) {
      SetError(Failure.message);
    } finally {
      SetBusy(false);
    }
  }

  return (
    <main className="main-content login-page">
      <div className="welcome"><p>ARENA OPS</p><h1>Sign in</h1></div>
      <form className="player-form" onSubmit={HandleSubmit}>
        <div className="form-grid">
          <label>Username<input name="username" autoComplete="username" maxLength={24} required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        </div>
        {Message && <p role="alert">{Message}</p>}
        <button className="primary-button" disabled={Busy}>{Busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
