/** Client-safe types for the redesigned Dashboard home widgets. */

export type EstimateStatusSlice = {
  key: "pending" | "approved" | "declined";
  label: string;
  count: number;
  color: string;
};

export type TopServiceRow = {
  name: string;
  amountCents: number;
  rank: number;
};

export type DashboardHomeWidgets = {
  overdueFollowUps: number;
  estimateStatus: EstimateStatusSlice[];
  topServices: TopServiceRow[];
};
