"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

export default function PlayersPage() {
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    date_of_birth: "",
    status: "ACTIVE",
  });

  const fetchPlayers = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const response = await fetch(`/api/players?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch players");
      }

      setPlayers(data.players);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  function resetForm() {
    setForm({
      username: "",
      email: "",
      password: "",
      date_of_birth: "",
      status: "ACTIVE",
    });

    setEditingId(null);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    const url = editingId
      ? `/api/players/${editingId}`
      : "/api/players";

    const method = editingId ? "PATCH" : "POST";

    const payload = {
      username: form.username,
      email: form.email,
      date_of_birth: form.date_of_birth,
    };

    if (editingId) {
      payload.status = form.status;
      if (form.password) payload.password = form.password;
    } else {
      payload.password = form.password;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Operation failed");
      }

      setMessage(data.message);
      resetForm();
      await fetchPlayers();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function handleEdit(player) {
    const dateOfBirth = player.date_of_birth
      ? String(player.date_of_birth).slice(0, 10)
      : "";

    setEditingId(player.player_id);

    setForm({
      username: player.username,
      email: player.email,
      password: "",
      date_of_birth: dateOfBirth,
      status: player.status,
    });

    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(playerId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this player?"
    );

    if (!confirmed) return;

    setMessage("");

    try {
      const response = await fetch(`/api/players/${playerId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete player");
      }

      setMessage(data.message);
      await fetchPlayers();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">MANAGEMENT</p>
          <h1>Players</h1>
          <p>Manage registered players in Arena Ops.</p>
        </div>

        <button className="secondary-button" onClick={fetchPlayers}>
          Refresh
        </button>
      </div>

      {message && (
        <div className="message">
          {message}
        </div>
      )}

      <section className="panel">
        <div className="section-heading">
          <h2>{editingId ? "Edit Player" : "Add New Player"}</h2>
        </div>

        <form className="player-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Username
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                maxLength={24}
                required
              />
            </label>

            <label>
              Email
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                maxLength={254}
                required
              />
            </label>

            <label>
              Date of Birth
              <input
                type="date"
                name="date_of_birth"
                value={form.date_of_birth}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              {editingId ? "New Password (optional)" : "Password"}
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                minLength={8}
                required={!editingId}
                placeholder={
                  editingId ? "Leave blank to keep current password" : ""
                }
              />
            </label>

            {editingId && (
              <label>
                Account Status
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="BANNED">Banned</option>
                </select>
              </label>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="primary-button">
              {editingId ? "Save Changes" : "Add Player"}
            </button>

            {editingId && (
              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Player Directory</h2>
            <p>{players.length} player(s) found</p>
          </div>
        </div>

        <div className="filter-bar">
          <input
            type="search"
            placeholder="Search by username or email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="BANNED">Banned</option>
          </select>
        </div>

        {loading ? (
          <p className="empty-state">Loading players...</p>
        ) : players.length === 0 ? (
          <p className="empty-state">No players found.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Date of Birth</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {players.map((player) => (
                  <tr key={player.player_id}>
                    <td>#{player.player_id}</td>
                    <td>{player.username}</td>
                    <td>{player.email}</td>
                    <td>
                      {player.date_of_birth
                        ? String(player.date_of_birth).slice(0, 10)
                        : "—"}
                    </td>
                    <td>{player.role}</td>
                    <td>
                      <span
                        className={`status ${
                          player.status === "ACTIVE"
                            ? "status-active"
                            : "status-banned"
                        }`}
                      >
                        {player.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="secondary-button"
                          onClick={() => handleEdit(player)}
                        >
                          Edit
                        </button>

                        <button
                          className="danger-button"
                          onClick={() => handleDelete(player.player_id)}
                        >
                          Delete
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
