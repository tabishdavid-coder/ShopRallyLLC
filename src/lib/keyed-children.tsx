import { Children, Fragment, isValidElement, type ReactNode } from "react";

/** Assign keys when App Router passes multiple RSC children to a client shell. */
export function KeyedChildren({ children }: { children: ReactNode }) {
  const nodes = Children.toArray(children);
  if (nodes.length === 0) return null;
  if (nodes.length === 1) return nodes[0];

  return nodes.map((node, index) => {
    if (isValidElement(node) && node.key != null) return node;
    return <Fragment key={`child-${index}`}>{node}</Fragment>;
  });
}
