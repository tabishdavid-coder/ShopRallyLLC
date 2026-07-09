import type { JobBoard } from "@/lib/job-board";
import { customerDisplayName } from "@/lib/format";
import { defaultRoOpenHref } from "@/lib/ro-workspace";
import { roEstimateActionHref } from "@/lib/ro-context-actions";

export type AttentionItem = {
  id: string;
  kind: "approval" | "balance" | "messages";
  title: string;
  subtitle?: string;
  href: string;
  priority: number;
};

export function buildAttentionItems(
  board: JobBoard,
  unreadSmsCount = 0,
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const card of board.estimates) {
    if (card.approvalSentAt && !card.authorizedAt) {
      items.push({
        id: `approval-${card.id}`,
        kind: "approval",
        title: card.estimateViewedAt
          ? `Estimate viewed · RO#${card.number}`
          : `Approval pending · RO#${card.number}`,
        subtitle: customerDisplayName(card.customer),
        href: defaultRoOpenHref(card.id),
        priority: 2,
      });
    }
  }

  for (const card of board.completed) {
    if ((card.invoiceBalanceCents ?? 0) > 0) {
      items.push({
        id: `balance-${card.id}`,
        kind: "balance",
        title: `Balance due · RO#${card.number}`,
        subtitle: customerDisplayName(card.customer),
        href: roEstimateActionHref(card.id, "payment"),
        priority: 1,
      });
    }
  }

  if (unreadSmsCount > 0) {
    items.push({
      id: "messages",
      kind: "messages",
      title: `${unreadSmsCount} unread message${unreadSmsCount === 1 ? "" : "s"}`,
      subtitle: "Reply from Messages",
      href: "/messages",
      priority: 3,
    });
  }

  return items.sort((a, b) => b.priority - a.priority).slice(0, 6);
}
