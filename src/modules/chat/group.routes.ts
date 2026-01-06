import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { create, add, history } from "./group.controller";

const router = Router();

// create group
router.post("/create", authMiddleware, create);

// add member
router.post("/add", authMiddleware, add);

// group history
router.get("/history", authMiddleware, history);

export default router;
