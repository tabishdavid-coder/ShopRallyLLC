"use client";

import { ChevronRight } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type MotorTaxonomyTreeNode = {
  motorSystemId: number;
  motorGroupId?: number;
  motorSubGroupId?: number;
  level: "system" | "group" | "subgroup";
  name: string;
  children: MotorTaxonomyTreeNode[];
};

type MotorTaxonomyTreeProps = {
  nodes: MotorTaxonomyTreeNode[];
  defaultOpen?: boolean;
};

function idLabel(node: MotorTaxonomyTreeNode): string {
  if (node.level === "system") return `S${node.motorSystemId}`;
  if (node.level === "group") return `G${node.motorGroupId}`;
  return `SG${node.motorSubGroupId}`;
}

function TreeNode({
  node,
  depth,
  defaultOpen,
}: {
  node: MotorTaxonomyTreeNode;
  depth: number;
  defaultOpen: boolean;
}) {
  const hasChildren = node.children.length > 0;
  const isLeaf = node.level === "subgroup";

  if (isLeaf || !hasChildren) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded px-2 py-1 text-sm",
          depth === 0 && "font-semibold text-brand-navy",
          depth === 1 && "text-foreground/90",
          depth >= 2 && "text-muted-foreground",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <span className="min-w-0 flex-1">{node.name}</span>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">{idLabel(node)}</span>
      </div>
    );
  }

  return (
    <Collapsible defaultOpen={defaultOpen && depth < 2}>
      <CollapsibleTrigger
        className={cn(
          "group flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm hover:bg-brand-navy/[0.04]",
          depth === 0 && "font-semibold text-brand-navy",
          depth === 1 && "font-medium text-foreground/90",
          depth >= 2 && "text-muted-foreground",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
        <span className="min-w-0 flex-1">{node.name}</span>
        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
          {node.children.length}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">{idLabel(node)}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {node.children.map((child) => (
          <TreeNode key={`${child.level}-${child.name}-${child.motorSubGroupId ?? child.motorGroupId ?? child.motorSystemId}`} node={child} depth={depth + 1} defaultOpen={defaultOpen} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function MotorTaxonomyTree({ nodes, defaultOpen = true }: MotorTaxonomyTreeProps) {
  return (
    <div className="rounded-lg border border-brand-navy/10 bg-card">
      {nodes.map((node) => (
        <TreeNode
          key={`${node.motorSystemId}-${node.name}`}
          node={node}
          depth={0}
          defaultOpen={defaultOpen}
        />
      ))}
    </div>
  );
}
