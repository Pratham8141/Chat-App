import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/db";
import { ENV } from "../../config/env";

export const registerUser = async (email: string, password: string) => {
  const hash = await bcrypt.hash(password, 10);

  const result = await pool.query(
    "INSERT INTO users(email, password_hash) VALUES($1,$2) RETURNING id,email",
    [email, hash]
  );

  return result.rows[0];
};

export const loginUser = async (email: string, password: string) => {
  const result = await pool.query(
    "SELECT * FROM users WHERE email=$1",
    [email]
  );

  if (!result.rows.length) {
    throw new Error("User not found");
  }

  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password_hash);

  if (!match) {
    throw new Error("Invalid password");
  }

  const token = jwt.sign({ id: user.id }, ENV.JWT_SECRET, {
    expiresIn: "7d",
  });

  return token;
};
