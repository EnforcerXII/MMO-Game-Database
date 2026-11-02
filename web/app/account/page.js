"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

export default function AccountPage() {
  const [Account, SetAccount] = useState(null);
  const [Message, SetMessage] = useState("");

  useEffect(() => {
    fetch("/api/account").then(async (Result) => {
      const Data = await Result.json();
      if (!Result.ok) throw new Error(Data.message);
      SetAccount(Data);
    }).catch((Error) => SetMessage(Error.message));
  }, []);

  return (
    <AppShell>
      <div className="welcome"><p>PLAYER PORTAL</p><h1>My account</h1></div>
      {Message && <p role="alert">{Message}</p>}
      {Account && <>
        <h2>Inventory</h2>
        <table><thead><tr><th>Item</th><th>Quantity</th></tr></thead>
          <tbody>{Account.inventory.map((Item) => <tr key={Item.item_name}><td>{Item.item_name}</td><td>{Item.quantity}</td></tr>)}</tbody></table>
        {!Account.inventory.length && <p>No items yet.</p>}
        <h2>Achievements</h2>
        <table><thead><tr><th>Achievement</th><th>Points</th><th>Match</th></tr></thead>
          <tbody>{Account.achievements.map((Achievement) => <tr key={`${Achievement.title}-${Achievement.match_id}`}><td>{Achievement.title}</td><td>{Achievement.points}</td><td>{Achievement.match_id}</td></tr>)}</tbody></table>
        {!Account.achievements.length && <p>No achievements yet.</p>}
      </>}
    </AppShell>
  );
}
