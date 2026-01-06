import { Request, Response } from "express";
import { createGroup, addMember, getGroupHistory } from "./group.service";

export const create = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Group name required" });
  }

  const group = await createGroup(name, userId);
  res.json(group);
};

export const add = async (req: Request, res: Response) => {
  const { groupId, userId } = req.body;

  if (!groupId || !userId) {
    return res.status(400).json({ error: "groupId and userId required" });
  }

  await addMember(groupId, userId);
  res.json({ ok: true });
};

export const history = async (req: Request, res: Response) => {
  const { groupId, limit, offset } = req.query;

  if (!groupId) {
    return res.status(400).json({ error: "groupId required" });
  }

  const msgs = await getGroupHistory(
    groupId as string,
    Number(limit) || 20,
    Number(offset) || 0
  );

  res.json(msgs);
};
