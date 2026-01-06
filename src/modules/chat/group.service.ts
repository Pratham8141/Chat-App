import { pool } from "../../config/db";

export const createGroup = async (name: string, creatorId: string) => {
  const group = await pool.query(
    `INSERT INTO groups(name, created_by)
     VALUES ($1, $2)
     RETURNING *`,
    [name, creatorId]
  );

  await pool.query(
    `INSERT INTO group_members(group_id, user_id, role)
     VALUES ($1, $2, 'admin')`,
    [group.rows[0].id, creatorId]
  );

  return group.rows[0];
};

export const addMember = async (groupId: string, userId: string) => {
  await pool.query(
    `INSERT INTO group_members(group_id, user_id)
     VALUES ($1, $2)`,
    [groupId, userId]
  );
};

export const getGroupHistory = async (
  groupId: string,
  limit = 20,
  offset = 0
) => {
  const res = await pool.query(
    `SELECT * FROM group_messages
     WHERE group_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [groupId, limit, offset]
  );

  return res.rows;
};
