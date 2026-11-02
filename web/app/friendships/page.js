"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

export default function FriendshipsPage() {
  const [players, setPlayers] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const query = selectedPlayer
        ? `?player_id=${selectedPlayer}`
        : "";

      const response = await fetch(`/api/friendships${query}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load friendships");
      }

      setPlayers(data.players);
      setFriendships(data.friendships);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPlayer]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function createFriendship(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch("/api/friendships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player1, player2 }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to create friendship");
      }

      setMessage(data.message);
      setPlayer1("");
      setPlayer2("");
      await fetchData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateStatus(friendship, status) {
    setMessage("");

    try {
      const response = await fetch(
        `/api/friendships/${friendship.player_low}/${friendship.player_high}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update status");
      }

      setMessage(data.message);
      await fetchData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteFriendship(friendship) {
    if (!window.confirm("Remove this relationship?")) return;

    setMessage("");

    try {
      const response = await fetch(
        `/api/friendships/${friendship.player_low}/${friendship.player_high}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to remove friendship");
      }

      setMessage(data.message);
      await fetchData();
    } catch (error) {
      setMessage(error.message);
    }
  }

  const filteredFriendships = friendships.filter((friendship) => {
    const matchesSearch =
      friendship.low_username.toLowerCase().includes(search.toLowerCase()) ||
      friendship.high_username.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || friendship.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const accepted = friendships.filter(
    (friendship) => friendship.status === "ACCEPTED"
  ).length;

  const pending = friendships.filter(
    (friendship) => friendship.status === "PENDING"
  ).length;

  const blocked = friendships.filter(
    (friendship) => friendship.status === "BLOCKED"
  ).length;

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">SOCIAL MANAGEMENT</p>
          <h1>Friendships</h1>
          <p>Manage player relationships and requests.</p>
        </div>

        <button className="secondary-button" onClick={fetchData}>
          Refresh
        </button>
      </div>

      {message && <div className="message">{message}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <p>Accepted</p>
          <h2>{accepted}</h2>
        </div>

        <div className="stat-card">
          <p>Pending</p>
          <h2>{pending}</h2>
        </div>

        <div className="stat-card">
          <p>Blocked</p>
          <h2>{blocked}</h2>
        </div>
      </div>

      <section className="panel">
        <div className="section-heading">
          <h2>Create Friendship Request</h2>
        </div>

        <form className="player-form" onSubmit={createFriendship}>
          <div className="form-grid">
            <label>
              First Player
              <select
                value={player1}
                onChange={(event) => setPlayer1(event.target.value)}
                required
              >
                <option value="">Select player</option>
                {players.map((player) => (
                  <option key={player.player_id} value={player.player_id}>
                    {player.username}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Second Player
              <select
                value={player2}
                onChange={(event) => setPlayer2(event.target.value)}
                required
              >
                <option value="">Select player</option>
                {players.map((player) => (
                  <option key={player.player_id} value={player.player_id}>
                    {player.username}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={!players.length}
            >
              Send Request
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Player Relationships</h2>
            <p>{filteredFriendships.length} relationship(s)</p>
          </div>
        </div>

        <div className="filter-bar">
          <select
            value={selectedPlayer}
            onChange={(event) => setSelectedPlayer(event.target.value)}
          >
            <option value="">All Players</option>
            {players.map((player) => (
              <option key={player.player_id} value={player.player_id}>
                {player.username}
              </option>
            ))}
          </select>

          <input
            type="search"
            placeholder="Search players..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>

        {loading ? (
          <p className="empty-state">Loading friendships...</p>
        ) : filteredFriendships.length === 0 ? (
          <p className="empty-state">No relationships found.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Player 1</th>
                  <th>Player 2</th>
                  <th>Status</th>
                  <th>Since</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredFriendships.map((friendship) => (
                  <tr
                    key={`${friendship.player_low}-${friendship.player_high}`}
                  >
                    <td>{friendship.low_username}</td>
                    <td>{friendship.high_username}</td>
                    <td>
                      <span className={`status-badge ${friendship.status.toLowerCase()}`}>
                        {friendship.status}
                      </span>
                    </td>
                    <td>
                      {new Date(friendship.since).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="table-actions">
                        <select
                          value={friendship.status}
                          onChange={(event) =>
                            updateStatus(friendship, event.target.value)
                          }
                        >
                          <option value="PENDING">Pending</option>
                          <option value="ACCEPTED">Accepted</option>
                          <option value="BLOCKED">Blocked</option>
                        </select>

                        <button
                          className="danger-button"
                          onClick={() => deleteFriendship(friendship)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
