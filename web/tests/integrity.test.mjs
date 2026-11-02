import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const Db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
});
const Tag = randomBytes(4).toString("hex");
const Ids = [];
let ItemId;
let GuildId;
const Password = randomBytes(18).toString("hex");
const Base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
try {
  for (let Index = 0; Index < 2; Index++) {
    const [Result] = await Db.execute(
      "INSERT INTO player (username,email,password_hash,date_of_birth,role) VALUES (?,?,?,'2000-01-01','ADMIN')",
      [`Integrity${Tag}${Index}`, `integrity${Tag}${Index}@example.com`, await bcrypt.hash(Password, 12)]
    );
    Ids.push(Result.insertId);
  }
  const [Item] = await Db.execute("INSERT INTO item (item_kind,item_name,base_price,damage) VALUES ('WEAPON',?,10,5)", [`Test${Tag}`]);
  ItemId = Item.insertId;
  const InvalidQueries = [
    ["UPDATE player SET username='   ' WHERE player_id=?", [Ids[0]]],
    ["UPDATE player SET email='invalid' WHERE player_id=?", [Ids[0]]],
    ["UPDATE player SET date_of_birth='2999-01-01' WHERE player_id=?", [Ids[0]]],
    ["UPDATE item SET base_price=-1 WHERE item_id=?", [ItemId]],
    ["UPDATE item SET slot_type='HEAD' WHERE item_id=?", [ItemId]],
    ["INSERT INTO inventory (player_id,item_id,quantity) VALUES (?,?,-1)", [Ids[0], ItemId]],
    ["INSERT INTO inventory (player_id,item_id,quantity) VALUES (?, ?, 1)", [Ids[0], -1]],
    ["INSERT INTO season (season_name,start_date,end_date) VALUES (?, '2026-02-01','2026-01-01')", [Tag]],
    ["INSERT INTO achievement VALUES (?, 'Test', -1)", [Tag]],
    ["INSERT INTO friendship (player_low,player_high) VALUES (?,?)", [Ids[0], Ids[0]]],
  ];
  for (const [Sql, Params] of InvalidQueries) {
    await assert.rejects(Db.execute(Sql, Params), (Error) => [3819, 1644, 1452].includes(Error.errno), Sql);
  }
  await Db.execute("INSERT INTO inventory (player_id,item_id,quantity) VALUES (?,?,3)", [Ids[0], ItemId]);
  await assert.rejects(Db.execute("CALL transfer_item(?,?,?,?)", [Ids[0], -1, ItemId, 2]));
  let [Rows] = await Db.execute("SELECT quantity FROM inventory WHERE player_id=? AND item_id=?", [Ids[0], ItemId]);
  assert.equal(Rows[0].quantity, 3, "failed transfer rolls back debit");
  await assert.rejects(Db.execute("CALL transfer_item(?,?,?,?)", [Ids[0], Ids[1], ItemId, -1]));
  await Db.execute("CALL transfer_item(?,?,?,?)", [Ids[0], Ids[1], ItemId, 3]);
  [Rows] = await Db.execute("SELECT player_id,quantity FROM inventory WHERE item_id=?", [ItemId]);
  assert.deepEqual(Rows.map((Row) => [Number(Row.player_id), Row.quantity]), [[Ids[1], 3]]);

  const Login = await fetch(`${Base}/api/auth/login`, { method: "POST", headers: { Origin: Base, "Content-Type": "application/json" }, body: JSON.stringify({ username: `Integrity${Tag}0`, password: Password }) });
  assert.equal(Login.status, 200);
  const Cookie = Login.headers.get("set-cookie").split(";")[0];
  async function Guild(Method, Body, Id = "") {
    return fetch(`${Base}/api/guilds${Id ? `/${Id}` : ""}`, { method: Method, headers: { Cookie, Origin: Base, "Content-Type": "application/json" }, body: JSON.stringify(Body) });
  }
  const Body = { guild_name: `Test${Tag}`, guild_tag: Tag.slice(0, 4), leader_id: Ids[0], treasury: 0 };
  const Created = await Guild("POST", Body);
  assert.equal(Created.status, 201, await Created.text());
  [Rows] = await Db.execute("SELECT guild_id FROM guild WHERE guild_name=?", [Body.guild_name]);
  GuildId = Rows[0].guild_id;
  const Updated = await Guild("PATCH", { ...Body, leader_id: Ids[1] }, GuildId);
  assert.equal(Updated.status, 200, await Updated.text());
  const Deleted = await Guild("DELETE", undefined, GuildId);
  assert.equal(Deleted.status, 200, await Deleted.text());
  GuildId = null;
  console.log("PASS: 10 direct SQL invalid-input checks, transfer rollback/full transfer, guild create/leader change/delete with foreign keys enabled");
} finally {
  if (GuildId) {
    await Db.execute("UPDATE guild SET leader_id=NULL WHERE guild_id=?", [GuildId]);
    await Db.execute("DELETE FROM guild WHERE guild_id=?", [GuildId]);
  }
  for (const Id of Ids) await Db.execute("DELETE FROM player WHERE player_id=?", [Id]);
  if (ItemId) await Db.execute("DELETE FROM item WHERE item_id=?", [ItemId]);
  await Db.end();
}
