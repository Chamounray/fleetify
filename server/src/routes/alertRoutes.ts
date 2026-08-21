import { Router } from "express";
import { listAlerts, resolveAlert } from "../controllers/alertController.js";

export const alertRouter = Router();
alertRouter.get("/", listAlerts);
alertRouter.post("/:id/resolve", resolveAlert);
