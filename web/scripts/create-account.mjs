import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

// Password is read from stdin, never from command-line arguments or source code.
const [Username, Email, BirthDate, Role = "PLAYER"] = process.argv.slice(2);
let Password = "";
for await (const Chunk of process.stdin) Password += Chunk;
Password = Password.replace(/\r?\n$/, "");
if (!Username || !Email || !BirthDate || !["ADMIN", "PLAYER"].includes(Role) ||
    Password.length < 8 || Buffer.byteLength(Password, "utf8") > 72) {
  throw new Error("Usage: provide password on stdin; args: username email YYYY-MM-DD ADMIN|PLAYER (password: 8+ characters, at most 72 UTF-8 bytes)");
}
const Connection = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
});
try {
  await Connection.execute(
    "INSERT INTO player (username, email, password_hash, date_of_birth, role) VALUES (?, ?, ?, ?, ?)",
    [Username, Email, await bcrypt.hash(Password, 12), BirthDate, Role]
  );
  console.log("Account created");
} finally { await Connection.end(); }
