import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ApplyStyleToAllDialog } from "./ApplyStyleToAllDialog";
import { studioTextElement } from "@/lib/backgroundStudio/text";
import { textLayer } from "@/lib/backgroundStudio/templates";
import { newDesign } from "@/lib/backgroundStudio/types";

afterEach(cleanup);
it("toggles a property checkbox once and submits Word Styler without accidentally copying content", () => {
  const apply = vi.fn(),
    element = studioTextElement(
      textLayer("Source caption", 0, 0, 1),
      newDesign(),
    );
  render(
    <ApplyStyleToAllDialog
      open
      onOpenChange={vi.fn()}
      currentElement={element}
      allElements={[element]}
      totalImages={3}
      onApply={apply}
    />,
  );
  fireEvent.click(screen.getByRole("checkbox", { name: "Word Styler" }));
  expect(screen.getByRole("checkbox", { name: "Word Styler" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Content" })).not.toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: "Apply to All" }));
  expect(apply).toHaveBeenCalledWith(
    element.id,
    expect.arrayContaining(["wordStyles", "wordStyleRules", "fontSize"]),
  );
  expect(apply.mock.calls[0][1]).not.toContain("content");
});
