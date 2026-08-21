import { Router } from "express";
import {
  activateReservation,
  cancelReservation,
  completeReservation,
  createReservation,
  getReservation,
  listReservations,
  timeline,
  updateReservation,
} from "../controllers/reservationController.js";

export const reservationRouter = Router();
reservationRouter.get("/", listReservations);
reservationRouter.get("/timeline", timeline);
reservationRouter.post("/", createReservation);
reservationRouter.get("/:id", getReservation);
reservationRouter.patch("/:id", updateReservation);
reservationRouter.post("/:id/cancel", cancelReservation);
reservationRouter.post("/:id/activate", activateReservation);
reservationRouter.post("/:id/complete", completeReservation);
