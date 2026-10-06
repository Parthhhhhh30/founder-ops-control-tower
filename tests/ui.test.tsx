import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ControlRoom } from "@/components/control-room";
describe("Operator UI", () => {
  it("selects an explicit reason and separates founder decisions", async () => {
    render(<ControlRoom />);
    await waitFor(() =>
      expect(
        screen.queryByText("Restoring workspace…"),
      ).not.toBeInTheDocument(),
    );
    const inspector = screen.getByRole("complementary", {
      name: "Record inspector",
    });
    expect(within(inspector).getByText("WHY ESCALATE?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Review decisions/ }));
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(
      within(inspector).getByText("REV-14 / DEMO POLICY V1"),
    ).toBeInTheDocument();
  });
  it("drafts communication without changing payment truth", async () => {
    render(<ControlRoom />);
    fireEvent.click(
      screen.getByRole("button", { name: /Prepare collection draft/ }),
    );
    await screen.findByDisplayValue(/Draft only/);
    expect(
      screen.getByRole("button", { name: /Record payment received/ }),
    ).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("no message sent");
    expect(
      screen.queryByRole("button", { name: /Send/ }),
    ).not.toBeInTheDocument();
  });
  it("renders mandatory new-starter gating", async () => {
    render(<ControlRoom />);
    fireEvent.click(screen.getByRole("button", { name: "People Ops" }));
    expect(screen.getByText(/NOT READY/)).toBeInTheDocument();
    expect(
      screen.getByText("Human decisions only · no candidate ranking"),
    ).toBeInTheDocument();
  });
});
