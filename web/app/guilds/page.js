
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

  // Guild member management state
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [members, setMembers] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [membersLoading, setMembersLoading] = useState(false);

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

  async function fetchMembers(guild) {
    setSelectedGuild(guild);
    setMembersLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/guilds/${guild.guild_id}/members`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch members");
      }

      setMembers(data.members);
      setAvailablePlayers(data.availablePlayers);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setMembersLoading(false);
    }
  }

  async function addMember(event) {
    event.preventDefault();

    try {
      const response = await fetch(
        `/api/guilds/${selectedGuild.guild_id}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ player_id: selectedPlayer }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add member");
      }

      setMessage(data.message);
      setSelectedPlayer("");
      await fetchMembers(selectedGuild);
      await fetchGuilds();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateMemberRole(playerId, guildRole) {
    try {
      const response = await fetch(
        `/api/guilds/${selectedGuild.guild_id}/members`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            player_id: playerId,
            guild_role: guildRole,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      setMessage(data.message);
      await fetchMembers(selectedGuild);
      await fetchGuilds();
    } catch (error) {
      setMessage(error.message);
      await fetchMembers(selectedGuild);
    }
  }

  async function removeMember(playerId, username) {
    if (!window.confirm(`Remove ${username} from this guild?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/guilds/${selectedGuild.guild_id}/members`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ player_id: playerId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove member");
      }

      setMessage(data.message);
      await fetchMembers(selectedGuild);
      await fetchGuilds();
    } catch (error) {
      setMessage(error.message);
    }
  }

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
        headers: { "Content-Type": "application/json" },
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

      if (selectedGuild?.guild_id === guildId) {
        setSelectedGuild(null);
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
                  <option key={player.player_id} value={player.player_id}>
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

      {/* Guild Member Management */}
      {selectedGuild && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>{selectedGuild.guild_name} - Members</h2>
              <p>Manage guild membership and roles.</p>
            </div>

            <button
              className="secondary-button"
              onClick={() => setSelectedGuild(null)}
            >
              Close
            </button>
          </div>

          <form className="filter-bar" onSubmit={addMember}>
            <select
              value={selectedPlayer}
              onChange={(event) => setSelectedPlayer(event.target.value)}
              required
            >
              <option value="">Select a player to add</option>
              {availablePlayers.map((player) => (
                <option key={player.player_id} value={player.player_id}>
                  {player.username} (#{player.player_id})
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="primary-button"
              disabled={!selectedPlayer}
            >
              Add Member
            </button>
          </form>

          {membersLoading ? (
            <p className="empty-state">Loading members...</p>
          ) : members.length === 0 ? (
            <p className="empty-state">No members found.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Player ID</th>
                    <th>Role</th>
                    <th>Joined On</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {members.map((member) => (
                    <tr key={member.player_id}>
                      <td>{member.username}</td>
                      <td>#{member.player_id}</td>
                      <td>
                        {member.guild_role === "LEADER" ? (
                          <span className="status status-active">
                            LEADER
                          </span>
                        ) : (
                          <select
                            value={member.guild_role}
                            onChange={(event) =>
                              updateMemberRole(
                                member.player_id,
                                event.target.value
                              )
                            }
                          >
                            <option value="MEMBER">MEMBER</option>
                            <option value="OFFICER">OFFICER</option>
                            <option value="LEADER">LEADER</option>
                          </select>
                        )}
                      </td>
                      <td>
                        {new Date(member.joined_on).toLocaleDateString("en-IN")}
                      </td>
                      <td>
                        {member.guild_role !== "LEADER" && (
                          <button
                            className="danger-button"
                            onClick={() =>
                              removeMember(
                                member.player_id,
                                member.username
                              )
                            }
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

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
                          className="secondary-button"
                          onClick={() => fetchMembers(guild)}
                        >
                          Manage Members
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
