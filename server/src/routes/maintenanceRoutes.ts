import { Router } from "express";
import {
  createMaintenance,
  deleteMaintenance,
  listMaintenance,
  upcomingMaintenance,
  updateMaintenance,
} from "../controllers/maintenanceController.js";

export const maintenanceRouter = Router();
maintenanceRouter.get("/", listMaintenance);
maintenanceRouter.get("/upcoming", upcomingMaintenance);
maintenanceRouter.post("/", createMaintenance);
maintenanceRouter.patch("/:id", updateMaintenance);
maintenanceRouter.delete("/:id", deleteMaintenance);
