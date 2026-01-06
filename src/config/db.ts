import { Pool } from "pg";

export const pool = new Pool({
  host: "localhost",
  user: "postgres",
  password: "Pratham8141",
  database: "chatapp",
  port: 5432,
});

pool.on("connect", () => {
  console.log("✅ PostgreSQL connected");
});
