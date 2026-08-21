import { Router } from "express";
import { getDashboard, getFinance } from "../controllers/dashboardController.js";

export const dashboardRouter = Router();
dashboardRouter.get("/", getDashboard);
dashboardRouter.get("/finance", getFinance);
