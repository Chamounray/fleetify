import { Router } from "express";
import { downloadPdf, previewDocument } from "../controllers/documentController.js";

export const documentRouter = Router();
documentRouter.get("/:id/:kind/print", previewDocument);
documentRouter.get("/:id/:kind/pdf", downloadPdf);
