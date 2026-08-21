import PDFDocument from "pdfkit";
import { env } from "../config/env.js";
import { Reservation } from "../models/Reservation.js";
import { notFound } from "../utils/api-error.js";
import { escapeHtml } from "../utils/text.js";
import { formatMoney } from "../utils/money.js";
import type { InspectionCheck } from "@fleetify/shared";

export type DocumentKind = "contract" | "receipt" | "pickup" | "return";

export async function reservationView(reservationId: string) {
  const reservation = await Reservation.findById(reservationId);
  if (!reservation) throw notFound("Reservation not found");
  return reservation;
}

export function renderHtml(kind: DocumentKind, reservation: Awaited<ReturnType<typeof reservationView>>): string {
  const title = {
    contract: "Rental Contract",
    receipt: "Rental Receipt",
    pickup: "Pickup Inspection Sheet",
    return: "Return Inspection Sheet",
  }[kind];
  const pickup = reservation.inspectionChecks.find((item) => item.kind === "pickup");
  const ret = reservation.inspectionChecks.find((item) => item.kind === "return");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: "Segoe UI", sans-serif; color: #020617; margin: 32px; }
    h1 { font-size: 22px; margin: 0 0 8px; }
    .meta { color: #334155; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <button onclick="window.print()">Print</button>
  <h1>${escapeHtml(env.BUSINESS_NAME)} - ${escapeHtml(title)}</h1>
  <p class="meta">${escapeHtml(env.BUSINESS_ADDRESS)}</p>
  <table>
    <tr><th>Reservation</th><td>${escapeHtml(String(reservation._id))}</td></tr>
    <tr><th>Status</th><td>${escapeHtml(reservation.status)}</td></tr>
    <tr><th>Customer</th><td>${escapeHtml(reservation.customerSnapshot.name)} (${escapeHtml(reservation.customerSnapshot.phone)})</td></tr>
    <tr><th>Vehicle</th><td>${escapeHtml(`${reservation.vehicleSnapshot.year} ${reservation.vehicleSnapshot.make} ${reservation.vehicleSnapshot.model}`)} / ${escapeHtml(reservation.vehicleSnapshot.licensePlate)}</td></tr>
    <tr><th>Dates</th><td>${escapeHtml(reservation.startDate)} to ${escapeHtml(reservation.endDate)}</td></tr>
    <tr><th>Daily rate</th><td>${escapeHtml(formatMoney(reservation.dailyRateCents))}</td></tr>
    <tr><th>Expected distance</th><td>${reservation.expectedDistanceKm} km</td></tr>
    <tr><th>Total</th><td>${escapeHtml(formatMoney(reservation.totalPriceCents))}</td></tr>
    <tr><th>Security deposit</th><td>${escapeHtml(formatMoney(reservation.securityDepositCents))}</td></tr>
  </table>
  ${inspectionBlock("Pickup", pickup)}
  ${inspectionBlock("Return", ret)}
</body>
</html>`;
}

function inspectionBlock(label: string, check?: InspectionCheck): string {
  if (!check) return `<p>${escapeHtml(label)} inspection not recorded.</p>`;
  const damage = check.damage
    .map((item) => `<li>${escapeHtml(item.zone)} - ${escapeHtml(item.type)} (${escapeHtml(item.severity)}): ${escapeHtml(item.notes)}</li>`)
    .join("");
  return `<h2>${escapeHtml(label)}</h2>
  <p>Odometer ${check.odometerKm} km / Fuel ${check.fuelLevelPct}%</p>
  <p>${escapeHtml(check.notes)}</p>
  <ul>${damage || "<li>No damage marks</li>"}</ul>`;
}

export async function renderPdf(kind: DocumentKind, reservation: Awaited<ReturnType<typeof reservationView>>): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
  const title = {
    contract: "Rental Contract",
    receipt: "Rental Receipt",
    pickup: "Pickup Inspection Sheet",
    return: "Return Inspection Sheet",
  }[kind];
  doc.fontSize(18).text(`${env.BUSINESS_NAME} - ${title}`);
  doc.moveDown(0.3).fontSize(10).fillColor("#334155").text(env.BUSINESS_ADDRESS);
  doc.fillColor("#020617").moveDown();
  const lines = [
    `Reservation: ${String(reservation._id)}`,
    `Status: ${reservation.status}`,
    `Customer: ${reservation.customerSnapshot.name} (${reservation.customerSnapshot.phone})`,
    `Vehicle: ${reservation.vehicleSnapshot.year} ${reservation.vehicleSnapshot.make} ${reservation.vehicleSnapshot.model} / ${reservation.vehicleSnapshot.licensePlate}`,
    `Dates: ${reservation.startDate} to ${reservation.endDate}`,
    `Daily rate: ${formatMoney(reservation.dailyRateCents)}`,
    `Expected distance: ${reservation.expectedDistanceKm} km`,
    `Total: ${formatMoney(reservation.totalPriceCents)}`,
    `Security deposit: ${formatMoney(reservation.securityDepositCents)}`,
  ];
  for (const line of lines) {
    doc.fontSize(11).text(line);
  }
  const pickup = reservation.inspectionChecks.find((item) => item.kind === "pickup");
  const ret = reservation.inspectionChecks.find((item) => item.kind === "return");
  writeInspection(doc, "Pickup", pickup);
  writeInspection(doc, "Return", ret);
  doc.end();
  return done;
}

function writeInspection(doc: PDFKit.PDFDocument, label: string, check?: InspectionCheck): void {
  doc.moveDown().fontSize(13).text(label);
  if (!check) {
    doc.fontSize(11).text("Not recorded.");
    return;
  }
  doc.fontSize(11).text(`Odometer ${check.odometerKm} km / Fuel ${check.fuelLevelPct}%`);
  doc.text(check.notes || "No notes");
  if (check.damage.length === 0) {
    doc.text("No damage marks");
    return;
  }
  for (const mark of check.damage) {
    doc.text(`${mark.zone} - ${mark.type} (${mark.severity}): ${mark.notes}`);
  }
}
