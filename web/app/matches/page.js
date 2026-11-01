"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

const emptyForm = {
  mode_code: "",
  season_id: "",
  status: "LIVE",
};

const emptyParticipant = {
  player_id: "",
  team_no: "1",
};

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [modes, setModes] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [selectedMatch, setSelectedMatch] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [availablePlayers, setAvailablePlayers] = useState([]);
  const [participantForm, setParticipantForm] = useState(emptyParticipant);
  const [statsForms, setStatsForms] = useState({});

  const fetchMatches = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const response = await fetch(`/api/matches?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch matches");
      }

      setMatches(data.matches);
      setModes(data.modes);
      setSeasons(data.seasons);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  function handleChange(event) {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch(
        editingId ? `/api/matches/${editingId}` : "/api/matches",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Operation failed");
      }

      setMessage(data.message);
      resetForm();
      await fetchMatches();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function handleEdit(match) {
    setEditingId(match.match_id);
    setForm({
      mode_code: match.mode_code,
      season_id: String(match.season_id),
      status: match.status,
    });

    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(match) {
    if (
      !window.confirm(
        `Delete match #${match.match_id}? Its participants and rounds will also be deleted.`
      )
    ) {
      return;
    }

    setMessage("");

    try {
      const response = await fetch(`/api/matches/${match.match_id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete match");
      }

      if (selectedMatch === match.match_id) {
        setSelectedMatch(null);
      }

      setMessage(data.message);
      await fetchMatches();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function openParticipants(match) {
    setMessage("");

    try {
      const response = await fetch(
        `/api/matches/${match.match_id}/participants`
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch participants");
      }

      setSelectedMatch(match.match_id);
      setParticipants(data.participants);
      setAvailablePlayers(data.players);

      const initialStats = {};

      for (const participant of data.participants) {
        initialStats[participant.player_id] = {
          team_no: String(participant.team_no),
          kills: String(participant.kills),
          deaths: String(participant.deaths),
          damage_dealt: String(participant.damage_dealt),
        };
      }

      setStatsForms(initialStats);
      setParticipantForm(emptyParticipant);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function refreshParticipants() {
    const response = await fetch(
      `/api/matches/${selectedMatch}/participants`
    );
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to refresh participants");
    }

    setParticipants(data.participants);
    setAvailablePlayers(data.players);

    const initialStats = {};

    for (const participant of data.participants) {
      initialStats[participant.player_id] = {
        team_no: String(participant.team_no),
        kills: String(participant.kills),
        deaths: String(participant.deaths),
        damage_dealt: String(participant.damage_dealt),
      };
    }

    setStatsForms(initialStats);
  }

  async function addParticipant(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch(
        `/api/matches/${selectedMatch}/participants`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(participantForm),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to add participant");
      }

      setMessage(data.message);
      await refreshParticipants();
      setParticipantForm(emptyParticipant);
      await fetchMatches();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function updateStatsField(playerId, field, value) {
    setStatsForms((previous) => ({
      ...previous,
      [playerId]: {
        ...previous[playerId],
        [field]: value,
      },
    }));
  }

  async function saveStats(playerId) {
    setMessage("");

    try {
      const response = await fetch(
        `/api/matches/${selectedMatch}/participants`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            player_id: playerId,
            ...statsForms[playerId],
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update statistics");
      }

      setMessage(data.message);
      await refreshParticipants();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function removeParticipant(playerId) {
    if (!window.confirm("Remove this player from the match?")) return;

    setMessage("");

    try {
      const response = await fetch(
        `/api/matches/${selectedMatch}/participants?player_id=${playerId}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to remove participant");
      }

      setMessage(data.message);
      await refreshParticipants();
      await fetchMatches();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">MANAGEMENT</p>
          <h1>Matches</h1>
          <p>Manage matches, teams, and player statistics.</p>
        </div>

        <button className="secondary-button" onClick={fetchMatches}>
          Refresh
        </button>
      </div>

      {message && <div className="message">{message}</div>}

      <section className="panel">
        <div className="section-heading">
          <h2>{editingId ? "Edit Match" : "Create Match"}</h2>
        </div>

        <form className="player-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Game Mode
              <select
                name="mode_code"
                value={form.mode_code}
                onChange={handleChange}
                required
              >
                <option value="">Select a mode</option>
                {modes.map((mode) => (
                  <option key={mode.mode_code} value={mode.mode_code}>
                    {mode.mode_name} ({mode.team_size} per team)
                  </option>
                ))}
              </select>
            </label>

            <label>
              Season
              <select
                name="season_id"
                value={form.season_id}
                onChange={handleChange}
                required
              >
                <option value="">Select a season</option>
                {seasons.map((season) => (
                  <option key={season.season_id} value={season.season_id}>
                    {season.season_name}
                  </option>
                ))}
              </select>
            </label>

            {editingId && (
              <label>
                Match Status
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="LIVE">Live</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ABANDONED">Abandoned</option>
                </select>
              </label>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="primary-button">
              {editingId ? "Save Changes" : "Create Match"}
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
            <h2>Match Directory</h2>
            <p>{matches.length} match(es) found</p>
          </div>
        </div>

        <div className="filter-bar">
          <input
            type="search"
            placeholder="Search game mode or season..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="LIVE">Live</option>
            <option value="COMPLETED">Completed</option>
            <option value="ABANDONED">Abandoned</option>
          </select>
        </div>

        {loading ? (
          <p className="empty-state">Loading matches...</p>
        ) : matches.length === 0 ? (
          <p className="empty-state">No matches found.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Game Mode</th>
                  <th>Season</th>
                  <th>Started</th>
                  <th>Participants</th>
                  <th>Rounds</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {matches.map((match) => (
                  <tr key={match.match_id}>
                    <td>#{match.match_id}</td>
                    <td>{match.mode_name}</td>
                    <td>{match.season_name}</td>
                    <td>
                      {new Date(match.started_at).toLocaleString()}
                    </td>
                    <td>{match.participant_count}</td>
                    <td>{match.round_count}</td>
                    <td>
                      <span
                        className={`status ${
                          match.status === "LIVE"
                            ? "status-active"
                            : "status-banned"
                        }`}
                      >
                        {match.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="secondary-button"
                          onClick={() => openParticipants(match)}
                        >
                          Players
                        </button>

                        <button
                          className="secondary-button"
                          onClick={() => handleEdit(match)}
                        >
                          Edit
                        </button>

                        <button
                          className="danger-button"
                          onClick={() => handleDelete(match)}
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

      {selectedMatch !== null && (
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Match #{selectedMatch} Participants</h2>
              <p>Manage teams and individual match statistics.</p>
            </div>

            <button
              className="secondary-button"
              onClick={() => setSelectedMatch(null)}
            >
              Close
            </button>
          </div>

          <form className="player-form" onSubmit={addParticipant}>
            <div className="form-grid">
              <label>
                Player
                <select
                  value={participantForm.player_id}
                  onChange={(event) =>
                    setParticipantForm((previous) => ({
                      ...previous,
                      player_id: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select a player</option>
                  {availablePlayers.map((player) => (
                    <option key={player.player_id} value={player.player_id}>
                      {player.username} (#{player.player_id})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Team Number
                <input
                  type="number"
                  min="1"
                  max="32767"
                  value={participantForm.team_no}
                  onChange={(event) =>
                    setParticipantForm((previous) => ({
                      ...previous,
                      team_no: event.target.value,
                    }))
                  }
                  required
                />
              </label>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={availablePlayers.length === 0}
              >
                Add Participant
              </button>
            </div>
          </form>

          {participants.length === 0 ? (
            <p className="empty-state">No participants in this match yet.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Team</th>
                    <th>Kills</th>
                    <th>Deaths</th>
                    <th>Damage</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {participants.map((participant) => {
                    const stats = statsForms[participant.player_id];

                    return (
                      <tr key={participant.player_id}>
                        <td>{participant.username}</td>

                        {[
                          "team_no",
                          "kills",
                          "deaths",
                          "damage_dealt",
                        ].map((field) => (
                          <td key={field}>
                            <input
                              className="table-input"
                              type="number"
                              min={field === "team_no" ? "1" : "0"}
                              max={
                                field === "damage_dealt"
                                  ? "2147483647"
                                  : "32767"
                              }
                              value={stats?.[field] ?? ""}
                              onChange={(event) =>
                                updateStatsField(
                                  participant.player_id,
                                  field,
                                  event.target.value
                                )
                              }
                            />
                          </td>
                        ))}

                        <td>
                          <div className="table-actions">
                            <button
                              className="secondary-button"
                              onClick={() => saveStats(participant.player_id)}
                            >
                              Save
                            </button>

                            <button
                              className="danger-button"
                              onClick={() =>
                                removeParticipant(participant.player_id)
                              }
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}
