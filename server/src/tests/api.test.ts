import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authToken, resetDb, startTestDb, stopTestDb } from "./helpers.js";

beforeAll(startTestDb);
afterEach(resetDb);
afterAll(stopTestDb);

describe("auth", () => {
  it("allows first setup and rejects a second setup", async () => {
    const first = await request(app).post("/api/auth/setup").send({
      email: "admin@fleetify.local",
      password: "ChangeMeNow!23",
      name: "Amina Cole",
    });
    expect(first.status).toBe(201);
    expect(first.body.token).toBeTruthy();
    expect(first.body.admin.role).toBe("SuperAdmin");

    const second = await request(app).post("/api/auth/setup").send({
      email: "other@fleetify.local",
      password: "ChangeMeNow!23",
      name: "Other",
    });
    expect(second.status).toBe(409);
  });

  it("rejects invalid login and missing JWT", async () => {
    await request(app).post("/api/auth/setup").send({
      email: "admin@fleetify.local",
      password: "ChangeMeNow!23",
    });
    const bad = await request(app).post("/api/auth/login").send({
      email: "admin@fleetify.local",
      password: "wrong-password-1",
    });
    expect(bad.status).toBe(401);
    const me = await request(app).get("/api/auth/me");
    expect(me.status).toBe(401);
  });
});

describe("vehicles and maintenance", () => {
  it("creates vehicles, protects deletion, and flags overdue oil changes", async () => {
    const token = await authToken();
    const created = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${token}`)
      .send({
        make: "Toyota",
        model: "Corolla",
        year: 2021,
        licensePlate: "abc-123",
        dailyRateCents: 8900,
        currentOdometerKm: 1200,
        fuelLevelPct: 70,
        inspectionExpiresAt: new Date(Date.now() + 86400000 * 200).toISOString(),
      });
    expect(created.status).toBe(201);
    expect(created.body.vehicle.licensePlate).toBe("ABC-123");
    expect(created.body.vehicle.bodyType).toBe("Sedan");

    const evaluated = await request(app)
      .post(`/api/vehicles/${created.body.vehicle._id}/evaluate`)
      .set("Authorization", `Bearer ${token}`)
      .send({ currentOdometerKm: 7200 });
    expect(evaluated.status).toBe(200);
    expect(evaluated.body.pendingCreated).toBeGreaterThan(0);
    expect(evaluated.body.vehicle.status).toBe("In Maintenance");

    const duplicate = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${token}`)
      .send({
        make: "Honda",
        model: "Civic",
        year: 2020,
        licensePlate: "ABC-123",
        dailyRateCents: 8000,
        currentOdometerKm: 1000,
        fuelLevelPct: 50,
        inspectionExpiresAt: new Date(Date.now() + 86400000 * 200).toISOString(),
      });
    expect(duplicate.status).toBe(409);

    const customer = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Lina Ortega", phone: "+1 (312) 847-1928" });
    const booking = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        vehicleId: created.body.vehicle._id,
        customerId: customer.body.customer._id,
        startDate: "2026-10-01",
        endDate: "2026-10-02",
        expectedDistanceKm: 40,
      });
    expect(booking.status).toBe(201);
    const blockedDelete = await request(app)
      .delete(`/api/vehicles/${created.body.vehicle._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(blockedDelete.status).toBe(409);
  });

  it("lists vehicles available for a date range and body type", async () => {
    const token = await authToken();
    const sedan = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${token}`)
      .send({
        make: "Toyota",
        model: "Camry",
        year: 2022,
        bodyType: "Sedan",
        licensePlate: "AVL-101",
        dailyRateCents: 9000,
        currentOdometerKm: 1000,
        fuelLevelPct: 80,
        inspectionExpiresAt: new Date(Date.now() + 86400000 * 200).toISOString(),
      });
    const suv = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${token}`)
      .send({
        make: "Honda",
        model: "CR-V",
        year: 2021,
        bodyType: "SUV",
        licensePlate: "AVL-204",
        dailyRateCents: 11000,
        currentOdometerKm: 2000,
        fuelLevelPct: 70,
        inspectionExpiresAt: new Date(Date.now() + 86400000 * 200).toISOString(),
      });
    expect(sedan.status).toBe(201);
    expect(suv.status).toBe(201);

    const customer = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Avail Tester", phone: "3125550199" });
    await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        vehicleId: suv.body.vehicle._id,
        customerId: customer.body.customer._id,
        startDate: "2026-03-02",
        endDate: "2026-03-14",
        expectedDistanceKm: 200,
      });

    const allFree = await request(app)
      .get("/api/vehicles/available?startDate=2026-03-02&endDate=2026-03-14")
      .set("Authorization", `Bearer ${token}`);
    expect(allFree.status).toBe(200);
    expect(allFree.body.count).toBe(1);
    expect(allFree.body.vehicles[0].licensePlate).toBe("AVL-101");

    const suvFree = await request(app)
      .get("/api/vehicles/available?startDate=2026-03-02&endDate=2026-03-14&type=SUV")
      .set("Authorization", `Bearer ${token}`);
    expect(suvFree.status).toBe(200);
    expect(suvFree.body.count).toBe(0);

    const later = await request(app)
      .get("/api/vehicles/available?startDate=2026-04-01&endDate=2026-04-05&type=SUV")
      .set("Authorization", `Bearer ${token}`);
    expect(later.status).toBe(200);
    expect(later.body.count).toBe(1);
    expect(later.body.vehicles[0].licensePlate).toBe("AVL-204");
  });

  it("completing maintenance records service odometer and does not recreate the same due item", async () => {
    const token = await authToken();
    const created = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${token}`)
      .send({
        make: "Toyota",
        model: "Corolla",
        year: 2021,
        licensePlate: "LOOP-1",
        dailyRateCents: 8900,
        currentOdometerKm: 1200,
        fuelLevelPct: 70,
        inspectionExpiresAt: new Date(Date.now() + 86400000 * 400).toISOString(),
      });
    expect(created.status).toBe(201);

    const evaluated = await request(app)
      .post(`/api/vehicles/${created.body.vehicle._id}/evaluate`)
      .set("Authorization", `Bearer ${token}`)
      .send({ currentOdometerKm: 7200 });
    expect(evaluated.status).toBe(200);
    expect(evaluated.body.vehicle.status).toBe("In Maintenance");

    const pending = await request(app)
      .get("/api/maintenance?status=Pending")
      .set("Authorization", `Bearer ${token}`);
    expect(pending.status).toBe(200);
    const oil = pending.body.records.find((row: { type: string }) => row.type === "Oil Change");
    expect(oil).toBeTruthy();
    expect(oil.vehicleId.licensePlate).toBe("LOOP-1");

    const completed = await request(app)
      .patch(`/api/maintenance/${oil._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "Completed" });
    expect(completed.status).toBe(200);
    expect(completed.body.record.odometerAtServiceKm).toBe(7200);
    expect(completed.body.record.status).toBe("Completed");

    const after = await request(app)
      .get("/api/maintenance?status=Pending")
      .set("Authorization", `Bearer ${token}`);
    const oilAgain = after.body.records.find((row: { type: string }) => row.type === "Oil Change");
    expect(oilAgain).toBeUndefined();

    const vehicle = await request(app)
      .get(`/api/vehicles/${created.body.vehicle._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(vehicle.body.vehicle.status).not.toBe("In Maintenance");
  });
});

describe("reservations", () => {
  it("rejects overlapping dates and completes rentals with maintenance checks", async () => {
    const token = await authToken();
    const vehicle = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${token}`)
      .send({
        make: "Mazda",
        model: "CX-5",
        year: 2022,
        licensePlate: "MZ-440",
        dailyRateCents: 12000,
        currentOdometerKm: 1000,
        fuelLevelPct: 80,
        inspectionExpiresAt: new Date(Date.now() + 86400000 * 400).toISOString(),
      });
    const customer = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Lina Ortega", phone: "+1 (312) 847-1928" });

    const first = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        vehicleId: vehicle.body.vehicle._id,
        customerId: customer.body.customer._id,
        startDate: "2026-08-20",
        endDate: "2026-08-22",
        expectedDistanceKm: 180,
      });
    expect(first.status).toBe(201);
    expect(first.body.reservation.totalPriceCents).toBe(36000);

    const overlap = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        vehicleId: vehicle.body.vehicle._id,
        customerId: customer.body.customer._id,
        startDate: "2026-08-22",
        endDate: "2026-08-24",
        expectedDistanceKm: 90,
      });
    expect(overlap.status).toBe(409);

    const canceled = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        vehicleId: vehicle.body.vehicle._id,
        customerId: customer.body.customer._id,
        startDate: "2026-08-25",
        endDate: "2026-08-26",
        expectedDistanceKm: 40,
      });
    expect(canceled.status).toBe(201);
    const cancelRes = await request(app)
      .post(`/api/reservations/${canceled.body.reservation._id}/cancel`)
      .set("Authorization", `Bearer ${token}`);
    expect(cancelRes.status).toBe(200);
    const reuse = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        vehicleId: vehicle.body.vehicle._id,
        customerId: customer.body.customer._id,
        startDate: "2026-08-25",
        endDate: "2026-08-26",
        expectedDistanceKm: 40,
      });
    expect(reuse.status).toBe(201);

    const activated = await request(app)
      .post(`/api/reservations/${first.body.reservation._id}/activate`)
      .set("Authorization", `Bearer ${token}`)
      .send({ pickupOdometerKm: 1000, pickupFuelLevelPct: 80, damage: [] });
    expect(activated.status).toBe(200);

    const completed = await request(app)
      .post(`/api/reservations/${first.body.reservation._id}/complete`)
      .set("Authorization", `Bearer ${token}`)
      .send({ returnOdometerKm: 7000, returnFuelLevelPct: 40, damage: [] });
    expect(completed.status).toBe(200);
    expect(completed.body.reservation.status).toBe("Completed");
  });

  it("requires acknowledgement for flagged customers and blocks blacklists", async () => {
    const token = await authToken();
    const vehicle = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${token}`)
      .send({
        make: "Ford",
        model: "Escape",
        year: 2019,
        licensePlate: "FD-19",
        dailyRateCents: 7000,
        currentOdometerKm: 4000,
        fuelLevelPct: 60,
        inspectionExpiresAt: new Date(Date.now() + 86400000 * 100).toISOString(),
      });
    const customer = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Marcus Hale", phone: "3125550199", unpaidBalanceCents: 4500 });
    const blocked = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        vehicleId: vehicle.body.vehicle._id,
        customerId: customer.body.customer._id,
        startDate: "2026-09-01",
        endDate: "2026-09-03",
        expectedDistanceKm: 50,
      });
    expect(blocked.status).toBe(400);

    await request(app)
      .patch(`/api/customers/${customer.body.customer._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ isBlacklisted: true, blacklistReason: "Unpaid damage" });
    const banned = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        vehicleId: vehicle.body.vehicle._id,
        customerId: customer.body.customer._id,
        startDate: "2026-09-01",
        endDate: "2026-09-03",
        expectedDistanceKm: 50,
        customerWarningAcknowledged: true,
      });
    expect(banned.status).toBe(403);
  });

  it("looks up customers by normalized phone", async () => {
    const token = await authToken();
    await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Nora Pike", phone: "+1 (206) 555-0144" });
    const found = await request(app)
      .get("/api/customers/lookup?phone=2065550144")
      .set("Authorization", `Bearer ${token}`);
    expect(found.status).toBe(200);
    expect(found.body.customer.name).toBe("Nora Pike");
  });

  it("returns rental history with vehicle, duration, and totals", async () => {
    const token = await authToken();
    const vehicle = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${token}`)
      .send({
        make: "Toyota",
        model: "Camry",
        year: 2022,
        licensePlate: "FLT-101",
        dailyRateCents: 9800,
        currentOdometerKm: 1000,
        fuelLevelPct: 70,
        inspectionExpiresAt: new Date(Date.now() + 86400000 * 200).toISOString(),
      });
    const customer = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Marcus Hale", phone: "4155550177", unpaidBalanceCents: 12500 });
    await request(app)
      .post(`/api/customers/${customer.body.customer._id}/incidents`)
      .set("Authorization", `Bearer ${token}`)
      .send({ kind: "unpaid_fine", notes: "Late return fee still open", amountCents: 12500 });
    const booking = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        vehicleId: vehicle.body.vehicle._id,
        customerId: customer.body.customer._id,
        startDate: "2026-07-08",
        endDate: "2026-07-11",
        expectedDistanceKm: 90,
        customerWarningAcknowledged: true,
      });
    expect(booking.status).toBe(201);
    const detail = await request(app)
      .get(`/api/customers/${customer.body.customer._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.history).toHaveLength(1);
    expect(detail.body.history[0].vehicle.licensePlate).toBe("FLT-101");
    expect(detail.body.history[0].vehicle.make).toBe("Toyota");
    expect(detail.body.history[0].durationDays).toBe(4);
    expect(detail.body.history[0].totalPriceCents).toBe(39200);
    expect(detail.body.history[0].securityDepositCents).toBe(7840);
    expect(detail.body.customer.incidents[0].amountCents).toBe(12500);
    expect(detail.body.customer.incidents[0].isResolved).toBe(false);

    const flagged = await request(app)
      .get("/api/customers?flagged=true")
      .set("Authorization", `Bearer ${token}`);
    expect(flagged.status).toBe(200);
    expect(flagged.body.customers.some((item: { name: string }) => item.name === "Marcus Hale")).toBe(true);
  });

  it("accepts a per-booking daily rate override in cents", async () => {
    const token = await authToken();
    const vehicle = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${token}`)
      .send({
        make: "Honda",
        model: "CR-V",
        year: 2021,
        licensePlate: "FLT-204",
        dailyRateCents: 11200,
        currentOdometerKm: 2000,
        fuelLevelPct: 60,
        inspectionExpiresAt: new Date(Date.now() + 86400000 * 200).toISOString(),
      });
    const customer = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Lina Ortega", phone: "+1 (312) 847-1928" });
    const booking = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        vehicleId: vehicle.body.vehicle._id,
        customerId: customer.body.customer._id,
        startDate: "2026-09-10",
        endDate: "2026-09-12",
        expectedDistanceKm: 80,
        dailyRateCents: 9000,
      });
    expect(booking.status).toBe(201);
    expect(booking.body.reservation.dailyRateCents).toBe(9000);
    expect(booking.body.reservation.totalPriceCents).toBe(27000);
    expect(booking.body.reservation.securityDepositCents).toBe(5400);

    const detail = await request(app)
      .get(`/api/reservations/${booking.body.reservation._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.vehicleDailyRateCents).toBe(11200);
  });
});

describe("alerts", () => {
  it("lists unresolved alerts and marks one resolved", async () => {
    const token = await authToken();
    const created = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${token}`)
      .send({
        make: "Toyota",
        model: "Corolla",
        year: 2021,
        licensePlate: "abc-123",
        dailyRateCents: 8900,
        currentOdometerKm: 1200,
        fuelLevelPct: 70,
        inspectionExpiresAt: new Date(Date.now() + 86400000 * 200).toISOString(),
      });
    await request(app)
      .post(`/api/vehicles/${created.body.vehicle._id}/evaluate`)
      .set("Authorization", `Bearer ${token}`)
      .send({ currentOdometerKm: 7200 });

    const listed = await request(app).get("/api/alerts").set("Authorization", `Bearer ${token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.alerts.length).toBeGreaterThan(0);
    expect(listed.body.alerts[0].isResolved).toBe(false);
    expect(listed.body.alerts[0].vehicle.licensePlate).toBe("ABC-123");

    const resolved = await request(app)
      .post(`/api/alerts/${listed.body.alerts[0]._id}/resolve`)
      .set("Authorization", `Bearer ${token}`);
    expect(resolved.status).toBe(200);
    expect(resolved.body.alert.isResolved).toBe(true);

    const remaining = await request(app).get("/api/alerts").set("Authorization", `Bearer ${token}`);
    expect(remaining.body.alerts.every((item: { isResolved: boolean }) => item.isResolved === false)).toBe(true);
  });
});

describe("finance and documents", () => {
  it("returns zeroed KPIs when the fleet is empty", async () => {
    const token = await authToken();
    const dash = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${token}`);
    expect(dash.status).toBe(200);
    expect(dash.body.kpis.totalVehicles).toBe(0);
    expect(dash.body.kpis.utilizationPct).toBe(0);
    expect(dash.body.kpis.monthlyGrossRevenueCents).toBe(0);
    expect(dash.body.kpis.trends.grossRevenuePct).toBe(0);
    expect(dash.body.mix.rentalIncomeCents).toBe(0);
    expect(dash.body.insights.busyWeekdays).toHaveLength(7);
    expect(dash.body.insights.busyMonths).toHaveLength(12);
  });
  it("ranks vehicles and renders local PDFs", async () => {
    const token = await authToken();
    const vehicle = await request(app)
      .post("/api/vehicles")
      .set("Authorization", `Bearer ${token}`)
      .send({
        make: "Kia",
        model: "Sportage",
        year: 2023,
        licensePlate: "KA-77",
        dailyRateCents: 15000,
        currentOdometerKm: 800,
        fuelLevelPct: 90,
        inspectionExpiresAt: new Date(Date.now() + 86400000 * 300).toISOString(),
      });
    const customer = await request(app)
      .post("/api/customers")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Priya Shah", phone: "4155550177" });
    const booking = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        vehicleId: vehicle.body.vehicle._id,
        customerId: customer.body.customer._id,
        startDate: "2026-08-01",
        endDate: "2026-08-03",
        expectedDistanceKm: 120,
      });
    await request(app)
      .post(`/api/reservations/${booking.body.reservation._id}/activate`)
      .set("Authorization", `Bearer ${token}`)
      .send({ pickupOdometerKm: 800, pickupFuelLevelPct: 90 });
    await request(app)
      .post(`/api/reservations/${booking.body.reservation._id}/complete`)
      .set("Authorization", `Bearer ${token}`)
      .send({ returnOdometerKm: 950, returnFuelLevelPct: 40 });
    await request(app)
      .post("/api/expenses")
      .set("Authorization", `Bearer ${token}`)
      .send({
        vehicleId: vehicle.body.vehicle._id,
        category: "Insurance",
        date: "2026-08-05",
        amountCents: 5000,
        receiptLabel: "Local policy",
      });

    const finance = await request(app)
      .get("/api/dashboard/finance?period=2026-08")
      .set("Authorization", `Bearer ${token}`);
    expect(finance.status).toBe(200);
    expect(finance.body.ranking[0].rentalIncomeCents).toBe(45000);
    expect(finance.body.ranking[0].expenseCents).toBe(5000);
    expect(finance.body.utilization).toBeGreaterThan(0);
    expect(finance.body.insights.topByRevenue[0].cents).toBe(45000);
    expect(finance.body.insights.costDrains[0].cents).toBe(5000);
    expect(finance.body.insights.topReturningCustomers[0].label).toBe("Priya Shah");

    const emptyDash = await request(app).get("/api/dashboard").set("Authorization", `Bearer ${token}`);
    expect(emptyDash.status).toBe(200);
    expect(emptyDash.body.kpis.totalVehicles).toBeGreaterThan(0);

    const pdf = await request(app)
      .get(`/api/documents/${booking.body.reservation._id}/receipt/pdf`)
      .set("Authorization", `Bearer ${token}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => callback(null, Buffer.concat(chunks)));
      });
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    expect((pdf.body as Buffer).length).toBeGreaterThan(100);
  });
});

describe("admin user management", () => {
  it("lets the super admin create edit and delete admins, and blocks regular admins", async () => {
    const token = await authToken();
    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(me.body.admin.role).toBe("SuperAdmin");

    const created = await request(app)
      .post("/api/admins")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Yard Lead",
        email: "yard.lead@fleetify.local",
        password: "ChangeMeNow!23",
      });
    expect(created.status).toBe(201);
    expect(created.body.admin.role).toBe("Admin");

    const listed = await request(app).get("/api/admins").set("Authorization", `Bearer ${token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.admins.length).toBe(2);

    const updated = await request(app)
      .patch(`/api/admins/${created.body.admin.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Yard Manager" });
    expect(updated.status).toBe(200);
    expect(updated.body.admin.name).toBe("Yard Manager");

    const adminLogin = await request(app).post("/api/auth/login").send({
      email: "yard.lead@fleetify.local",
      password: "ChangeMeNow!23",
    });
    expect(adminLogin.status).toBe(200);
    expect(adminLogin.body.admin.role).toBe("Admin");

    const blocked = await request(app)
      .get("/api/admins")
      .set("Authorization", `Bearer ${adminLogin.body.token}`);
    expect(blocked.status).toBe(403);

    const selfDelete = await request(app)
      .delete(`/api/admins/${me.body.admin.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(selfDelete.status).toBe(403);

    const removed = await request(app)
      .delete(`/api/admins/${created.body.admin.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(removed.status).toBe(204);
  });
});
