"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

const emptyForm = {
  achievement_code: "",
  title: "",
  points: "10",
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [unlocks, setUnlocks] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);

  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [selectedAchievement, setSelectedAchievement] = useState("");
  const [selectedMatch, setSelectedMatch] = useState("");

  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingCode, setEditingCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchAchievements = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/achievements?search=${encodeURIComponent(search)}`
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch achievements");
      }

      setAchievements(data.achievements);
    } catch (error) {
      setMessage(error.message);
    }
  }, [search]);

  const fetchUnlocks = useCallback(async () => {
    try {
      const query = selectedPlayer
        ? `?player_id=${selectedPlayer}`
        : "";

      const response = await fetch(
        `/api/achievements/unlocks${query}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch achievements");
      }

      setPlayers(data.players);
      setMatches(data.matches);
      setUnlocks(data.unlocks);
      setTotalPoints(data.totalPoints);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPlayer]);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  useEffect(() => {
    fetchUnlocks();
  }, [fetchUnlocks]);

  function handleChange(event) {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingCode(null);
  }

  async function submitAchievement(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch(
        editingCode
          ? `/api/achievements/${encodeURIComponent(editingCode)}`
          : "/api/achievements",
        {
          method: editingCode ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Achievement operation failed");
      }

      setMessage(data.message);
      resetForm();
      await fetchAchievements();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function editAchievement(achievement) {
    setEditingCode(achievement.achievement_code);

    setForm({
      achievement_code: achievement.achievement_code,
      title: achievement.title,
      points: String(achievement.points),
    });
  }

  async function deleteAchievement(achievement) {
    if (!window.confirm(`Delete "${achievement.title}"?`)) return;

    setMessage("");

    try {
      const response = await fetch(
        `/api/achievements/${encodeURIComponent(achievement.achievement_code)}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete achievement");
      }

      setMessage(data.message);
      await fetchAchievements();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function awardAchievement(event) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch("/api/achievements/unlocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_id: selectedPlayer,
          achievement_code: selectedAchievement,
          match_id: selectedMatch,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to award achievement");
      }

      setMessage(data.message);
      setSelectedAchievement("");
      setSelectedMatch("");
      await fetchUnlocks();
      await fetchAchievements();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function removeAchievement(unlock) {
    if (!window.confirm("Remove this achievement from the player?")) return;

    setMessage("");

    try {
      const params = new URLSearchParams({
        player_id: unlock.player_id,
        match_id: unlock.match_id,
        achievement_code: unlock.achievement_code,
      });

      const response = await fetch(
        `/api/achievements/unlocks?${params.toString()}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to remove achievement");
      }

      setMessage(data.message);
      await fetchUnlocks();
      await fetchAchievements();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <p className="eyebrow">MANAGEMENT</p>
          <h1>Achievements</h1>
          <p>Manage achievements and player rewards.</p>
        </div>

        <button
          className="secondary-button"
          onClick={() => {
            fetchAchievements();
            fetchUnlocks();
          }}
        >
          Refresh
        </button>
      </div>

      {message && <div className="message">{message}</div>}

      <section className="panel">
        <div className="section-heading">
          <h2>{editingCode ? "Edit Achievement" : "Create Achievement"}</h2>
        </div>

        <form className="player-form" onSubmit={submitAchievement}>
          <div className="form-grid">
            <label>
              Achievement Code
              <input
                name="achievement_code"
                value={form.achievement_code}
                onChange={handleChange}
                maxLength={24}
                disabled={Boolean(editingCode)}
                required
              />
            </label>

            <label>
              Title
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                maxLength={60}
                required
              />
            </label>

            <label>
              Points
              <input
                type="number"
                name="points"
                min="0"
                max="32767"
                value={form.points}
                onChange={handleChange}
                required
              />
            </label>
          </div>

          <div className="form-actions">
            <button type="submit" className="primary-button">
              {editingCode ? "Save Changes" : "Create Achievement"}
            </button>

            {editingCode && (
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
            <h2>Achievement Catalogue</h2>
            <p>{achievements.length} achievement(s) found</p>
          </div>
        </div>

        <div className="filter-bar">
          <input
            type="search"
            placeholder="Search achievements..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {achievements.length === 0 ? (
          <p className="empty-state">No achievements found.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Title</th>
                  <th>Points</th>
                  <th>Players Unlocked</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {achievements.map((achievement) => (
                  <tr key={achievement.achievement_code}>
                    <td>{achievement.achievement_code}</td>
                    <td>{achievement.title}</td>
                    <td>{achievement.points}</td>
                    <td>{achievement.players_unlocked}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="secondary-button"
                          onClick={() => editAchievement(achievement)}
                        >
                          Edit
                        </button>

                        <button
                          className="danger-button"
                          onClick={() => deleteAchievement(achievement)}
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

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Player Achievements</h2>
            <p>Assign and view unlocked achievements.</p>
          </div>
        </div>

        <label className="inventory-player-select">
          Player
          <select
            value={selectedPlayer}
            onChange={(event) => setSelectedPlayer(event.target.value)}
          >
            <option value="">Select a player</option>
            {players.map((player) => (
              <option key={player.player_id} value={player.player_id}>
                {player.username} (#{player.player_id})
              </option>
            ))}
          </select>
        </label>

        {selectedPlayer && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <p>Total Achievement Points</p>
                <h2>{totalPoints}</h2>
              </div>

              <div className="stat-card">
                <p>Achievements Unlocked</p>
                <h2>{unlocks.length}</h2>
              </div>
            </div>

            <form className="player-form" onSubmit={awardAchievement}>
              <div className="form-grid">
                <label>
                  Achievement
                  <select
                    value={selectedAchievement}
                    onChange={(event) =>
                      setSelectedAchievement(event.target.value)
                    }
                    required
                  >
                    <option value="">Select an achievement</option>
                    {achievements.map((achievement) => (
                      <option
                        key={achievement.achievement_code}
                        value={achievement.achievement_code}
                      >
                        {achievement.title} ({achievement.points} points)
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Match
                  <select
                    value={selectedMatch}
                    onChange={(event) =>
                      setSelectedMatch(event.target.value)
                    }
                    required
                  >
                    <option value="">Select a match</option>
                    {matches.map((match) => (
                      <option key={match.match_id} value={match.match_id}>
                        Match #{match.match_id} ({match.mode_code})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={!achievements.length || !matches.length}
                >
                  Award Achievement
                </button>
              </div>
            </form>

            <div className="section-heading">
              <h2>Unlocked Achievements</h2>
            </div>

            {loading ? (
              <p className="empty-state">Loading achievements...</p>
            ) : unlocks.length === 0 ? (
              <p className="empty-state">
                This player has no unlocked achievements.
              </p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Achievement</th>
                      <th>Code</th>
                      <th>Points</th>
                      <th>Match</th>
                      <th>Unlocked At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {unlocks.map((unlock) => (
                      <tr
                        key={`${unlock.achievement_code}-${unlock.match_id}`}
                      >
                        <td>{unlock.title}</td>
                        <td>{unlock.achievement_code}</td>
                        <td>{unlock.points}</td>
                        <td>#{unlock.match_id}</td>
                        <td>
                          {new Date(unlock.unlocked_at).toLocaleString()}
                        </td>
                        <td>
                          <button
                            className="danger-button"
                            onClick={() => removeAchievement(unlock)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </AppShell>
  );
}
