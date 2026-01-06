import { Request, Response } from "express";
import { getChatHistory } from "./message.service";

/**
 * GET /messages/:userId
 */
export const getHistory = async (req: any, res: Response) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    const messages = await getChatHistory(
      currentUserId,
      otherUserId
    );

    res.json(messages);
  } catch (err) {
    console.error("Failed to fetch history", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
};
