import { pool } from "../../config/db";

/* ============================
   SEND MESSAGE (WITH REPLY)
============================ */

export const saveMessage = async (
  senderId: string,
  receiverId: string,
  content: string,
  replyTo?: string | null
) => {
  const res = await pool.query(
    `
    INSERT INTO messages (sender_id, receiver_id, content, reply_to)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [senderId, receiverId, content, replyTo || null]
  );

  return res.rows[0];
};

/* ============================
   CHAT HISTORY (NO PAGINATION)
============================ */

export const getChatHistory = async (
  userId: string,
  otherUserId: string
) => {
  const result = await pool.query(
    `
    SELECT 
      m.*,

      -- 🔁 REPLY MESSAGE
      CASE 
        WHEN rm.id IS NOT NULL THEN
          json_build_object(
            'id', rm.id,
            'sender_id', rm.sender_id,
            'content', rm.content
          )
        ELSE NULL
      END AS reply_message,

      -- ❤️ REACTIONS
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'emoji', r.emoji,
            'count', r.count
          )
        ) FILTER (WHERE r.emoji IS NOT NULL),
        '[]'
      ) AS reactions

    FROM messages m

    -- 🔁 JOIN REPLIED MESSAGE
    LEFT JOIN messages rm ON rm.id = m.reply_to

    -- ❤️ JOIN REACTIONS
    LEFT JOIN (
      SELECT message_id, emoji, COUNT(*)::int AS count
      FROM message_reactions
      GROUP BY message_id, emoji
    ) r ON r.message_id = m.id

    WHERE 
      (m.sender_id = $1 AND m.receiver_id = $2)
      OR
      (m.sender_id = $2 AND m.receiver_id = $1)
      AND m.is_deleted = false  -- 🆕 PREVENT DELETED MSG DUPLICATES

    GROUP BY m.id, rm.id, rm.sender_id, rm.content  -- 🆕 COMPLETE GROUP BY
    ORDER BY m.created_at ASC
    `,
    [userId, otherUserId]
  );

  return result.rows;
};

/* ============================
   PAGINATED CHAT HISTORY
============================ */

export const getChatHistoryPaginated = async (
  userId: string,
  otherUserId: string,
  limit = 20,
  cursor?: string
) => {
  const values: any[] = [userId, otherUserId, limit];
  let cursorQuery = "";

  if (cursor) {
    values.push(cursor);
    cursorQuery = `AND m.created_at < $4`;
  }

  const res = await pool.query(
    `
    SELECT 
      m.*,

      -- 🔁 REPLY MESSAGE
      CASE 
        WHEN rm.id IS NOT NULL THEN
          json_build_object(
            'id', rm.id,
            'sender_id', rm.sender_id,
            'content', rm.content
          )
        ELSE NULL
      END AS reply_message,

      -- ❤️ REACTIONS
      COALESCE(
        json_agg(
          DISTINCT jsonb_build_object(
            'emoji', r.emoji,
            'count', r.count
          )
        ) FILTER (WHERE r.emoji IS NOT NULL),
        '[]'
      ) AS reactions

    FROM messages m

    LEFT JOIN messages rm ON rm.id = m.reply_to

    LEFT JOIN (
      SELECT message_id, emoji, COUNT(*)::int AS count
      FROM message_reactions
      GROUP BY message_id, emoji
    ) r ON r.message_id = m.id

    WHERE
      (
        (m.sender_id = $1 AND m.receiver_id = $2)
        OR
        (m.sender_id = $2 AND m.receiver_id = $1)
      )
      AND m.is_deleted = false  -- 🆕 PREVENT DELETED MSG DUPLICATES
      ${cursorQuery}

    GROUP BY m.id, rm.id, rm.sender_id, rm.content  -- 🆕 COMPLETE GROUP BY
    ORDER BY m.created_at DESC
    LIMIT $3
    `,
    values
  );

  return res.rows.reverse(); // UI order
};

/* ============================
   MARK MESSAGES AS SEEN
============================ */

export const markMessagesSeen = async (
  senderId: string,
  receiverId: string
) => {
  await pool.query(
    `
    UPDATE messages
    SET status = 'seen'
    WHERE sender_id = $1
      AND receiver_id = $2
      AND status != 'seen'
      AND is_deleted = false  -- 🆕 SKIP DELETED
    `,
    [senderId, receiverId]
  );
};

/* ============================
   UNREAD COUNTS
============================ */

export const getUnreadCount = async (receiverId: string) => {
  const result = await pool.query(
    `
    SELECT sender_id, COUNT(*)::int AS count
    FROM messages
    WHERE receiver_id = $1
      AND status != 'seen'
      AND is_deleted = false  -- 🆕 EXCLUDE DELETED
    GROUP BY sender_id
    `,
    [receiverId]
  );

  return result.rows;
};

export const getUnreadCounts = async (userId: string) => {
  const result = await pool.query(
    `
    SELECT sender_id, COUNT(*)::int AS count
    FROM messages
    WHERE receiver_id = $1
      AND status != 'seen'
      AND is_deleted = false  -- 🆕 EXCLUDE DELETED
    GROUP BY sender_id
    `,
    [userId]
  );

  return result.rows;
};

/* ============================
   LAST MESSAGE PER CHAT
============================ */

export const getLastMessages = async (userId: string) => {
  const result = await pool.query(
    `
    SELECT DISTINCT ON (
      CASE
        WHEN sender_id = $1 THEN receiver_id
        ELSE sender_id
      END
    )
    id,
    sender_id,
    receiver_id,
    content,
    created_at
    FROM messages
    WHERE (sender_id = $1 OR receiver_id = $1)
      AND is_deleted = false  -- 🆕 ONLY NON-DELETED
    ORDER BY
      CASE
        WHEN sender_id = $1 THEN receiver_id
        ELSE sender_id
      END,
      created_at DESC
    `,
    [userId]
  );

  return result.rows;
};

/* ============================
   ❤️ REACTIONS
============================ */

export const reactToMessage = async (
  messageId: string,
  userId: string,
  emoji: string
) => {
  await pool.query(
    `
    INSERT INTO message_reactions (message_id, user_id, emoji)
    VALUES ($1, $2, $3)
    ON CONFLICT (message_id, user_id)
    DO UPDATE SET emoji = EXCLUDED.emoji
    `,
    [messageId, userId, emoji]
  );

  const result = await pool.query(
    `
    SELECT emoji, COUNT(*)::int AS count
    FROM message_reactions
    WHERE message_id = $1
    GROUP BY emoji
    ORDER BY emoji  -- 🆕 CONSISTENT ORDER
    `,
    [messageId]
  );

  return result.rows;
};

/* ============================
   🗑️ DELETE MESSAGE
============================ */

/**
 * Delete message for everyone
 * Only sender is allowed to delete
 */
export const deleteMessage = async (
  messageId: string,
  userId: string
) => {
  // 1️⃣ Check current delete state
  const check = await pool.query(
    `
    SELECT is_deleted
    FROM messages
    WHERE id = $1 AND sender_id = $2
    `,
    [messageId, userId]
  );

  if (check.rowCount === 0) return null;

  // 2️⃣ If already deleted → HARD DELETE
  if (check.rows[0].is_deleted === true) {
    await pool.query(
      `DELETE FROM messages WHERE id = $1 AND sender_id = $2`,
      [messageId, userId]
    );

    // 🆕 CASCADE DELETE REACTIONS
    await pool.query(
      `DELETE FROM message_reactions WHERE message_id = $1`,
      [messageId]
    );

    return { hardDeleted: true };
  }

  // 3️⃣ Else → SOFT DELETE
  const res = await pool.query(
    `
    UPDATE messages
    SET is_deleted = true,
        content = 'This message was deleted',
        updated_at = NOW()  -- 🆕 TRACK DELETE TIME
    WHERE id = $1 AND sender_id = $2
    RETURNING *
    `,
    [messageId, userId]
  );

  return { hardDeleted: false, message: res.rows[0] };
};
