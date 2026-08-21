import { Router } from "express";
import {
  createVehicle,
  deleteVehicle,
  evaluateVehicle,
  getVehicle,
  listAvailableVehicles,
  listVehicles,
  updateVehicle,
} from "../controllers/vehicleController.js";

export const vehicleRouter = Router();
vehicleRouter.get("/", listVehicles);
vehicleRouter.get("/available", listAvailableVehicles);
vehicleRouter.post("/", createVehicle);
vehicleRouter.get("/:id", getVehicle);
vehicleRouter.patch("/:id", updateVehicle);
vehicleRouter.delete("/:id", deleteVehicle);
vehicleRouter.post("/:id/evaluate", evaluateVehicle);
