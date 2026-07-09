/** Client-safe MOTOR taxonomy tree types and builders (no server-only imports). */

export type MotorTaxonomyLevel = "system" | "group" | "subgroup";

export type MotorTaxonomyFlatNode = {
  nodeKey: string;
  level: MotorTaxonomyLevel;
  motorSystemId: number;
  motorGroupId?: number;
  motorSubGroupId?: number;
  name: string;
  parentNodeKey?: string;
};

export type MotorTaxonomyTreeNode = {
  motorSystemId: number;
  motorGroupId?: number;
  motorSubGroupId?: number;
  level: MotorTaxonomyLevel;
  name: string;
  children: MotorTaxonomyTreeNode[];
};

/** Build nested tree from flat DrillDown nodes. */
export function buildMotorTaxonomyTreeFromFlat(
  nodes: MotorTaxonomyFlatNode[],
): MotorTaxonomyTreeNode[] {
  const byKey = new Map<string, MotorTaxonomyTreeNode>();
  for (const node of nodes) {
    byKey.set(node.nodeKey, {
      motorSystemId: node.motorSystemId,
      motorGroupId: node.motorGroupId,
      motorSubGroupId: node.motorSubGroupId,
      level: node.level,
      name: node.name,
      children: [],
    });
  }

  const roots: MotorTaxonomyTreeNode[] = [];
  for (const node of nodes) {
    const treeNode = byKey.get(node.nodeKey)!;
    if (!node.parentNodeKey) {
      roots.push(treeNode);
      continue;
    }
    const parent = byKey.get(node.parentNodeKey);
    if (parent) parent.children.push(treeNode);
    else roots.push(treeNode);
  }

  return roots.sort((a, b) => a.name.localeCompare(b.name));
}

export function shopSystemId(motorSystemId: number): string {
  return `motor-s-${motorSystemId}`;
}

export function shopGroupId(motorGroupId: number): string {
  return `motor-g-${motorGroupId}`;
}

export function shopSubGroupId(motorSubGroupId: number): string {
  return `motor-sg-${motorSubGroupId}`;
}

export function motorSubGroupIdFromShopId(id: string): number | null {
  const m = /^motor-sg-(\d+)$/.exec(id);
  return m ? Number(m[1]) : null;
}

export function isMotorAlignedSubcategoryId(id: string): boolean {
  return id.startsWith("motor-sg-");
}

export function subgroupKeywords(name: string): string[] {
  const lower = name.toLowerCase();
  const tokens = lower.split(/[\s/&,-]+/).filter((t) => t.length > 2);
  return [lower, ...tokens];
}
