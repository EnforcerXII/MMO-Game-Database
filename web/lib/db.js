import mysql from "mysql2/promise";

import { readFileSync } from "node:fs";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === "true" ? {
    rejectUnauthorized: true,
    ...(process.env.DB_SSL_CA ? { ca: readFileSync(process.env.DB_SSL_CA, "utf8") } : {}),
  } : undefined,
  // SQL DATE values have no timezone; preserve birthdays without UTC conversion.
  dateStrings: ["DATE"],
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
