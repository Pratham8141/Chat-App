import { pool } from "../../config/db";

export const toggleReaction = async (
  messageId: string,
  userId: string,
  emoji: string
) => {
  const exists = await pool.query(
    `SELECT 1 FROM message_reactions 
     WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
    [messageId, userId, emoji]
  );

  if (exists.rowCount) {
    await pool.query(
      `DELETE FROM message_reactions 
       WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
      [messageId, userId, emoji]
    );
  } else {
    await pool.query(
      `INSERT INTO message_reactions (message_id, user_id, emoji)
       VALUES ($1, $2, $3)`,
      [messageId, userId, emoji]
    );
  }

  const reactions = await pool.query(
    `SELECT emoji, COUNT(*)::int as count
     FROM message_reactions
     WHERE message_id = $1
     GROUP BY emoji`,
    [messageId]
  );

  return reactions.rows;
};
