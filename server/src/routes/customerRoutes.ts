import { Router } from "express";
import {
  addIncident,
  createCustomer,
  getCustomer,
  listCustomers,
  lookupCustomer,
  resolveIncident,
  updateCustomer,
} from "../controllers/customerController.js";

export const customerRouter = Router();
customerRouter.get("/", listCustomers);
customerRouter.get("/lookup", lookupCustomer);
customerRouter.post("/", createCustomer);
customerRouter.get("/:id", getCustomer);
customerRouter.patch("/:id", updateCustomer);
customerRouter.post("/:id/incidents", addIncident);
customerRouter.post("/:id/incidents/:incidentId/resolve", resolveIncident);
