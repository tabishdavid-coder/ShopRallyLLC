export type PickedElement = {
  tag: string;
  id?: string;
  classes?: string;
  text?: string;
};

export function clearHighlights() {
  document.querySelectorAll(".design-mode-highlight").forEach((el) => {
    el.classList.remove("design-mode-highlight");
  });
}

export function highlightElement(el: Element | null) {
  clearHighlights();
  el?.classList.add("design-mode-highlight");
}
