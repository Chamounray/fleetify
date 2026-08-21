import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { DamageMatrix } from "./DamageMatrix";

describe("DamageMatrix", () => {
  it("exposes named zones for keyboard use", () => {
    render(
      <MemoryRouter>
        <DamageMatrix value={[]} onChange={() => undefined} />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("Front bumper")).toBeInTheDocument();
    expect(screen.getByLabelText("Windshield")).toBeInTheDocument();
  });
});
