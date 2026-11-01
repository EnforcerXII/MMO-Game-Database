"use client";

import { useEffect, useState } from "react";

const initialStats = {
  players: 0,
  guilds: 0,
  matches: 0,
  items: 0,
  achievements: 0,
};

export default function Home() {
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStats() {
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
    }

    fetchStats();
  }, []);

  const cards = [
    { label: "Players", value: stats.players },
    { label: "Guilds", value: stats.guilds },
    { label: "Matches", value: stats.matches },
    { label: "Items", value: stats.items },
    { label: "Achievements", value: stats.achievements },
  ];

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <h2>ARENA OPS</h2>
        <p className="sidebar-label">MANAGEMENT</p>
        <div className="nav-item active">Overview</div>
        <div className="nav-item">Players</div>
        <div className="nav-item">Guilds</div>
        <div className="nav-item">Matches</div>
        <div className="nav-item">Inventory</div>
        <div className="nav-item">Achievements</div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">GAME MANAGEMENT SYSTEM</p>
            <h1>Dashboard</h1>
          </div>
          <span className="status">SYSTEM ONLINE</span>
        </header>

        <section className="welcome">
          <p>ARENA OVERVIEW</p>
          <h2>Welcome to Arena Ops.</h2>
          <span>
            Manage your players, guilds, matches and game resources.
          </span>
        </section>

        <section className="stats-section">
          <h2>Database Overview</h2>

          {loading ? (
            <p>Loading statistics...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : (
            <div className="stats-grid">
              {cards.map((card) => (
                <div className="stat-card" key={card.label}>
                  <p>{card.label}</p>
                  <h3>{card.value}</h3>
                  <span>REGISTERED RECORDS</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
