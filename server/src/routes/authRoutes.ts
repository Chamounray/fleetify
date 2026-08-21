import { Router } from "express";
import { getSetupStatus, login, me, setup } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();
authRouter.get("/setup-status", getSetupStatus);
authRouter.post("/setup", setup);
authRouter.post("/login", login);
authRouter.get("/me", requireAuth, me);
