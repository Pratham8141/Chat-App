import { pool } from "../../config/db";

export const saveGroupMessage = async (
  groupId: string,
  senderId: string,
  content: string
) => {
  const res = await pool.query(
    `INSERT INTO group_messages(group_id, sender_id, content)
     VALUES ($1,$2,$3) RETURNING *`,
    [groupId, senderId, content]
  );
  return res.rows[0];
};
