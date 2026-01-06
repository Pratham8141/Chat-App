import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  getChatHistoryPaginated,
  getUnreadCounts,
} from "./message.service";

const router = Router();

/* ============================
   PAGINATED CHAT HISTORY
============================ */

router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const currentUserId = (req as any).user.id;
    const otherUserId = req.params.userId;

    const limit = Number(req.query.limit || 20);
    const cursor = req.query.cursor as string | undefined;

    const messages = await getChatHistoryPaginated(
      currentUserId,
      otherUserId,
      limit,
      cursor
    );

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/* ============================
   UNREAD COUNTS
============================ */

router.get("/unread", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const data = await getUnreadCounts(userId);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to fetch unread counts" });
  }
});

export default router;
