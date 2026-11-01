"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";

const initialStats = {
  players: 0,
  guilds: 0,
  matches: 0,
  items: 0,
  achievements: 0,
};

const cards = [
  { label: "Players", key: "players", href: "/players" },
  { label: "Guilds", key: "guilds", href: "/guilds" },
  { label: "Matches", key: "matches", href: "/matches" },
  { label: "Items", key: "items", href: "/inventory" },
  { label: "Achievements", key: "achievements", href: "/achievements" },
];

export default function Home() {
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error("Could not load dashboard statistics");
      }

      setStats(data.stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <AppShell>
      <header className="topbar">
        <div>
          <p className="eyebrow">GAME MANAGEMENT SYSTEM</p>
          <h1>Dashboard</h1>
        </div>

        <button className="secondary-button" onClick={fetchStats}>
          ↻ Refresh
        </button>
      </header>

      <section className="welcome">
        <p>ARENA OVERVIEW</p>
        <h2>Welcome to Arena Ops.</h2>
        <span>
          Manage your players, guilds, matches and game resources.
        </span>
      </section>

      <section className="stats-section">
        <div className="section-heading">
          <h2>Database Overview</h2>
          <span>LIVE DATABASE DATA</span>
        </div>

        {loading ? (
          <p>Loading statistics...</p>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : (
          <div className="stats-grid">
            {cards.map((card) => (
              <Link
                href={card.href}
                className="stat-card"
                key={card.key}
              >
                <p>{card.label}</p>
                <h3>{stats[card.key]}</h3>
                <span>VIEW RECORDS →</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
