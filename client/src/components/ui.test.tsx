import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Warning } from "@phosphor-icons/react";
import { KpiCard, StatusBadge, dollarsToCents, rentalDays } from "./ui";

describe("StatusBadge", () => {
  it("renders status text, not color alone", () => {
    render(<StatusBadge value="In Maintenance" />);
    expect(screen.getByText("In Maintenance")).toBeInTheDocument();
  });
});

describe("dollarsToCents", () => {
  it("converts dollar input to integer cents", () => {
    expect(dollarsToCents("80")).toBe(8000);
    expect(dollarsToCents("80.50")).toBe(8050);
    expect(dollarsToCents("")).toBe(0);
  });
});

describe("rentalDays", () => {
  it("counts inclusive billed days", () => {
    expect(rentalDays("2026-07-08", "2026-07-11")).toBe(4);
    expect(rentalDays("2026-08-20", "2026-08-20")).toBe(1);
    expect(rentalDays("", "2026-08-20")).toBe(0);
  });
});

describe("KpiCard", () => {
  it("links to a drill-down when to is set", () => {
    render(
      <MemoryRouter>
        <KpiCard label="Urgent alerts" value="3" icon={Warning} to="/alerts" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/alerts");
    expect(screen.getByText("Urgent alerts")).toBeInTheDocument();
  });
});
