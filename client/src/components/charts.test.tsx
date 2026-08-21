import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HorizontalBars } from "./charts";

describe("HorizontalBars", () => {
  it("shows labels and values for ranking charts", () => {
    render(
      <HorizontalBars
        title="Best cars by revenue"
        moneyValues
        items={[{ label: "FLT-101", cents: 19600, hint: "Toyota Camry" }]}
      />,
    );
    expect(screen.getByText("Best cars by revenue")).toBeInTheDocument();
    expect(screen.getByText("FLT-101")).toBeInTheDocument();
  });
});
