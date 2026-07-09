import { formatApprovalTimestamp, shopTimezone } from "@/lib/shop-timezone";
import { publicUrl } from "@/lib/app-url";

export type RoAuthorizationJob = {
  name: string;
  approvedAt: Date;
};

export type RoAuthorizationEmailInput = {
  roNumber: number;
  roId: string;
  customerName: string;
  vehicleLabel: string;
  shopState: string | null;
  approvedJobs: RoAuthorizationJob[];
  declinedJobNames: string[];
  signatureCaptured?: boolean;
  signerName?: string | null;
};

export type RoAuthorizationEmail = {
  subject: string;
  body: string;
};

/** Build RO authorization notification email (plain text). */
export function buildRoAuthorizationEmail(input: RoAuthorizationEmailInput): RoAuthorizationEmail {
  const totalCount = input.approvedJobs.length + input.declinedJobNames.length;
  const approvedCount = input.approvedJobs.length;
  const tz = shopTimezone(input.shopState);
  const roLink = publicUrl(`/repair-orders/${input.roId}/estimate`);

  const subject = `RO #${input.roNumber} Authorization`;

  const heading = `${approvedCount} of ${totalCount} Jobs approved for RO #${input.roNumber}: ${input.customerName}'s ${input.vehicleLabel}`;

  const intro = `${input.customerName} approved ${approvedCount} of ${totalCount} jobs on RO #${input.roNumber} for their ${input.vehicleLabel}:`;

  const approvedLines =
    input.approvedJobs.length > 0
      ? input.approvedJobs
          .map(
            (j) =>
              `  ${j.name} — approved on ${formatApprovalTimestamp(j.approvedAt, tz)}`,
          )
          .join("\n")
      : "  None";

  const declinedLines =
    input.declinedJobNames.length > 0
      ? input.declinedJobNames.map((n) => `  ${n}`).join("\n")
      : "  None";

  const signatureLine =
    input.signatureCaptured && input.signerName
      ? `Customer signature captured — signed by ${input.signerName}. View the signature on the repair order in ShopRally.`
      : input.signatureCaptured
        ? "Customer signature captured. View the signature on the repair order in ShopRally."
        : null;

  const body = [
    "ShopRally",
    "",
    heading,
    "",
    intro,
    "",
    "Approved Jobs:",
    approvedLines,
    "",
    "Declined Jobs:",
    declinedLines,
    "",
    ...(signatureLine ? [signatureLine, ""] : []),
    `View repair order: ${roLink}`,
    "",
    "Cheers,",
    "— The ShopRally Team",
    "",
    "—",
    "Have questions? We're here to help.",
    "Email us: info@getshoprally.com",
    "",
    "ShopRally · Shop Management Software",
  ].join("\n");

  return { subject, body };
}
