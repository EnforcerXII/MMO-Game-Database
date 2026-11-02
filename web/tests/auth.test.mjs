import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const Base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const Connection = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
});
const Suffix = randomBytes(4).toString("hex");
const Password = randomBytes(18).toString("hex");
const Ids = [];
async function Call(Path, Method = "GET", Body, Cookie) {
  return fetch(`${Base}${Path}`, { method: Method, headers: {
    Origin: Base, "Content-Type": "application/json", ...(Cookie ? { Cookie } : {}),
  }, ...(Body === undefined ? {} : { body: JSON.stringify(Body) }) });
}
async function Login(Username) {
  const Result = await Call("/api/auth/login", "POST", { username: Username, password: Password });
  assert.equal(Result.status, 200);
  assert.match(Result.headers.get("set-cookie"), /HttpOnly/i);
  return Result.headers.get("set-cookie").split(";")[0];
}
try {
  for (const Role of ["ADMIN", "PLAYER"]) {
    const [Result] = await Connection.execute(
      "INSERT INTO player (username,email,password_hash,date_of_birth,role) VALUES (?,?,?,'2000-01-01',?)",
      [`${Role}_${Suffix}`, `${Role}_${Suffix}@example.com`, await bcrypt.hash(Password, 12), Role]
    );
    Ids.push(Result.insertId);
  }
  for (const Path of ["dashboard", "players", "guilds", "matches", "inventory", "items", "achievements", "achievements/unlocks", "db-test", "matches/1/rounds", "matches/1/participants"]) {
    assert.equal((await Call(`/api/${Path}`)).status, 401, Path);
  }
  const Admin = await Login(`ADMIN_${Suffix}`);
  assert.equal((await fetch(`${Base}/api/players`, { method: "POST", headers: {
    Cookie: Admin, Origin: "https://untrusted.example", "Content-Type": "application/json",
  }, body: "{}" })).status, 403);
  assert.equal((await Call("/api/players", "POST", { username: 123 }, Admin)).status, 400);
  const Player = await Login(`PLAYER_${Suffix}`);
  const PlayersResult = await Call("/api/players", "GET", undefined, Admin);
  assert.equal(PlayersResult.status, 200);
  const PlayersData = await PlayersResult.json();
  assert.equal(PlayersData.players.find((Row) => Number(Row.player_id) === Ids[0]).date_of_birth, "2000-01-01");
  for (const Method of ["GET", "POST", "PATCH", "DELETE"]) {
    const Path = ["PATCH", "DELETE"].includes(Method) ? `/api/players/${Ids[0]}` : "/api/players";
    assert.equal((await Call(Path, Method, undefined, Player)).status, 403);
  }
  const Account = await (await Call(`/api/account?player_id=${Ids[0]}`, "GET", undefined, Player)).json();
  assert.equal(Number(Account.player.player_id), Ids[1]);
  assert.equal(Account.player.password_hash, undefined);
  await Connection.execute("UPDATE player SET status='BANNED' WHERE player_id=?", [Ids[1]]);
  assert.equal((await Call("/api/account", "GET", undefined, Player)).status, 401);
  await Connection.execute("UPDATE player SET status='ACTIVE' WHERE player_id=?", [Ids[1]]);
  await Connection.execute("UPDATE player SET password_hash=? WHERE player_id=?", [await bcrypt.hash(randomBytes(16).toString("hex"), 12), Ids[1]]);
  assert.equal((await Call("/api/account", "GET", undefined, Player)).status, 401);
  assert.equal((await Call("/api/auth/logout", "POST", undefined, Admin)).status, 200);
  assert.equal((await Call("/api/players", "GET", undefined, Admin)).status, 401);
  console.log("PASS: anonymous API denial, admin access, player denial, own-account isolation, ban/password revocation, logout");
} finally {
  for (const Id of Ids) await Connection.execute("DELETE FROM player WHERE player_id=?", [Id]);
  await Connection.end();
}
