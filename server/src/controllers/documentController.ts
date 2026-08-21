import { z } from "zod";
import type { Request, Response } from "express";
import { asyncHandler } from "../utils/async-handler.js";
import { renderHtml, renderPdf, reservationView, type DocumentKind } from "../services/documentService.js";
import { routeParam } from "../utils/params.js";

const kindSchema = z.enum(["contract", "receipt", "pickup", "return"]);

export const previewDocument = asyncHandler(async (req: Request, res: Response) => {
  const kind = kindSchema.parse(req.params.kind) as DocumentKind;
  const reservation = await reservationView(routeParam(req.params.id));
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(renderHtml(kind, reservation));
});

export const downloadPdf = asyncHandler(async (req: Request, res: Response) => {
  const kind = kindSchema.parse(req.params.kind) as DocumentKind;
  const reservation = await reservationView(routeParam(req.params.id));
  const pdf = await renderPdf(kind, reservation);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${kind}-${String(reservation._id)}.pdf"`,
  );
  res.send(pdf);
});
