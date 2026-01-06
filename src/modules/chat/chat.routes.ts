import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { getUsers } from "./chat.controller";

const router = Router();

router.get("/me", authMiddleware, (req, res) => {
  res.json({
    message: "Protected chat route",
    user: (req as any).user,
  });
});

// ✅ USERS LIST
router.get("/users", authMiddleware, getUsers);

export default router;
