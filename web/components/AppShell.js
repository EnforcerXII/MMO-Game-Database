"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppShell({ children }) {
  const [Player, SetPlayer] = useState(null);
  const [Message, SetMessage] = useState("");
  const Pathname = usePathname();
  const Router = useRouter();

  useEffect(() => {
    let Active = true;
    fetch("/api/auth/session").then(async (Result) => {
      const Data = await Result.json();
      if (Result.status === 401) return Router.replace("/login");
      if (!Result.ok) throw new Error("Unable to verify session. Please reload.");
      if (Data.player.role !== "ADMIN" && Pathname !== "/account") {
        return Router.replace("/account");
      }
      if (Active) SetPlayer(Data.player);
    }).catch((Error) => { if (Active) SetMessage(Error.message); });
    return () => { Active = false; };
  }, [Pathname, Router]);

  async function SignOut() {
    try {
      const Result = await fetch("/api/auth/logout", { method: "POST" });
      if (!Result.ok) throw new Error("Sign-out failed. Please retry.");
      // Discard cached authenticated pages when the session ends.
      window.location.replace("/login");
    } catch (Error) { SetMessage(Error.message); }
  }

  if (!Player) return <main className="main-content">{Message || "Checking session…"}</main>;

  return (
    <div className="dashboard">
      <Sidebar Role={Player.role} />
      <main className="main-content">
        <div className="topbar"><p>{Player.username} · {Player.role}</p>
          <button className="secondary-button" onClick={SignOut}>Sign out</button></div>
        {Message && <p role="alert">{Message}</p>}
        {children}
      </main>
    </div>
  );
}
