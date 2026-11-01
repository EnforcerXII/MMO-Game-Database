"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

const emptyForm = {
  guild_name: "",
  guild_tag: "",
  leader_id: "",
  treasury: "0.00",
};

export default function GuildsPage() {
  const [guilds, setGuilds] = useState([]);
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchGuilds = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (search) params.set("search", search);

      const response = await fetch(`/api/guilds?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch guilds");
      }

      setGuilds(data.guilds);
      setPlayers(data.players);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchGuilds();
  }, [fetchGuilds]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: name === "guild_tag" ? value.toUpperCase() : value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    const url = editingId
      ? `/api/guilds/${editingId}`
      : "/api/guilds";

    try {
      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Operation failed");
      }

      setMessage(data.message);
      resetForm();
      await fetchGuilds();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function handleEdit(guild) {
    setEditingId(guild.guild_id);

    setForm({
      guild_name: guild.guild_name,
      guild_tag: guild.guild_tag,
      leader_id: String(guild.leader_id),
      treasury: String(guild.treasury),
    });

    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(guildId, guildName) {
    if (!window.confirm(`Delete the guild "${guildName}"?`)) {
      return;
    }

    setMessage("");

    try {
      const response = await fetch(`/api/guilds/${guildId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete guild");
      }

      setMessage(data.message);
      await fetchGuilds();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">MANAGEMENT</p>
          <h1>Guilds</h1>
          <p>Manage guilds, leaders, and treasury balances.</p>
        </div>

        <button className="secondary-button" onClick={fetchGuilds}>
          Refresh
        </button>
      </div>

      {message && <div className="message">{message}</div>}

      <section className="panel">
        <div className="section-heading">
          <h2>{editingId ? "Edit Guild" : "Create Guild"}</h2>
        </div>

        <form className="player-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Guild Name
              <input
                name="guild_name"
                value={form.guild_name}
                onChange={handleChange}
                maxLength={32}
                required
              />
            </label>

            <label>
              Guild Tag
              <input
                name="guild_tag"
                value={form.guild_tag}
                onChange={handleChange}
                maxLength={4}
                minLength={4}
                placeholder="e.g. NOVA"
                required
              />
            </label>

            <label>
              Guild Leader
              <select
                name="leader_id"
                value={form.leader_id}
                onChange={handleChange}
                required
              >
                <option value="">Select a player</option>
                {players.map((player) => (
                  <option
                    key={player.player_id}
                    value={player.player_id}
                  >
                    {player.username} (#{player.player_id})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Treasury
              <input
                type="number"
                name="treasury"
                value={form.treasury}
                onChange={handleChange}
                min="0"
                max="9999999999.99"
                step="0.01"
                required
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="primary-button">
              {editingId ? "Save Changes" : "Create Guild"}
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
            <h2>Guild Directory</h2>
            <p>{guilds.length} guild(s) found</p>
          </div>
        </div>

        <div className="filter-bar">
          <input
            type="search"
            placeholder="Search guild name, tag, or leader..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {loading ? (
          <p className="empty-state">Loading guilds...</p>
        ) : guilds.length === 0 ? (
          <p className="empty-state">No guilds found.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Guild</th>
                  <th>Tag</th>
                  <th>Leader</th>
                  <th>Members</th>
                  <th>Treasury</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {guilds.map((guild) => (
                  <tr key={guild.guild_id}>
                    <td>#{guild.guild_id}</td>
                    <td>{guild.guild_name}</td>
                    <td>
                      <span className="status status-active">
                        {guild.guild_tag}
                      </span>
                    </td>
                    <td>{guild.leader_name}</td>
                    <td>{guild.member_count}</td>
                    <td>
                      {Number(guild.treasury).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="secondary-button"
                          onClick={() => handleEdit(guild)}
                        >
                          Edit
                        </button>

                        <button
                          className="danger-button"
                          onClick={() =>
                            handleDelete(guild.guild_id, guild.guild_name)
                          }
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
