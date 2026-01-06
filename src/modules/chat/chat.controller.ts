import { Request, Response } from "express";
import { pool } from "../../config/db";

export const getUsers = async (req: Request, res: Response) => {
  const currentUserId = (req as any).user.id;

  const result = await pool.query(
    "SELECT id, email, last_seen FROM users WHERE id != $1",
    [currentUserId]
  );

  res.json(result.rows);
};
