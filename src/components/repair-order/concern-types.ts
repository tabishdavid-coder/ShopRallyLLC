import type { InspectionItemStatus } from "@/generated/prisma";

export type ConcernRow = {
  id: string;
  kind: "CUSTOMER" | "TECHNICIAN";
  text: string;
  finding: string | null;
  inspectionRating: InspectionItemStatus | null;
  copiedJobId: string | null;
};
