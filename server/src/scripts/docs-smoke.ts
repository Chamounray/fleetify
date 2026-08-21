import { renderPdf, type DocumentKind } from "../services/documentService.js";

const reservation = {
  _id: "000000000000000000000001",
  status: "Completed",
  customerSnapshot: { name: "Lina Ortega", phone: "+1 (312) 847-1928", email: "" },
  vehicleSnapshot: { make: "Toyota", model: "Camry", year: 2022, licensePlate: "FLT-101" },
  startDate: "2026-08-18",
  endDate: "2026-08-20",
  dailyRateCents: 9800,
  expectedDistanceKm: 140,
  totalPriceCents: 29400,
  securityDepositCents: 5880,
  inspectionChecks: [],
};

async function main(): Promise<void> {
  for (const kind of ["contract", "receipt", "pickup", "return"] as DocumentKind[]) {
    const pdf = await renderPdf(kind, reservation as never);
    if (pdf.length < 200) {
      throw new Error(`PDF too small for ${kind}`);
    }
  }
  console.log("Document smoke test passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
