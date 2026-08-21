import { Router } from "express";
import { requireSuperAdmin } from "../middleware/auth.js";
import {
  createAdmin,
  deleteAdmin,
  listAdmins,
  updateAdmin,
} from "../controllers/adminController.js";

export const adminRouter = Router();
adminRouter.use(requireSuperAdmin);
adminRouter.get("/", listAdmins);
adminRouter.post("/", createAdmin);
adminRouter.patch("/:id", updateAdmin);
adminRouter.delete("/:id", deleteAdmin);
