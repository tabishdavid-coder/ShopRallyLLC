/** Vehicle identity checks for maintenance-plan redemptions (one car per subscription). */

export type EnrolledVehicle = {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  plate: string | null;
  plateState: string | null;
  vin: string | null;
};

export type VehicleGateStatus = "verified" | "confirm_required" | "blocked";

export type VehicleGateResult = {
  status: VehicleGateStatus;
  message: string | null;
  enrolledLabel: string;
  enrolledPlate: string | null;
  enrolledVinLast6: string | null;
};

export function normalizePlate(plate: string): string {
  return plate.replace(/[\s-]/g, "").toUpperCase();
}

export function vinLast6(vin: string | null | undefined): string | null {
  const v = vin?.trim().toUpperCase();
  if (!v || v.length < 6) return null;
  return v.slice(-6);
}

export function enrolledVehicleLabel(v: EnrolledVehicle): string {
  const ymm = [v.year, v.make, v.model].filter(Boolean).join(" ");
  return ymm || "Enrolled vehicle";
}

export function enrolledVehicleDetail(v: EnrolledVehicle): string {
  const parts = [enrolledVehicleLabel(v)];
  if (v.plate?.trim()) {
    parts.push(v.plate.trim().toUpperCase());
  }
  const last6 = vinLast6(v.vin);
  if (last6) parts.push(`VIN …${last6}`);
  return parts.join(" · ");
}

/** Heuristic: query looks like a plate or VIN scan (not phone/name). */
export function isPlateOrVinQuery(query: string): boolean {
  const q = query.trim();
  if (!q) return false;
  const digits = q.replace(/\D/g, "");
  if (digits.length >= 10) return false;
  if (/^[A-HJ-NPR-Z0-9]{17}$/i.test(q.replace(/\s/g, ""))) return true;
  if (/^[A-Z0-9]{2,8}$/i.test(q.replace(/[\s-]/g, ""))) return true;
  return false;
}

export function vehicleIdMatches(
  enrolled: EnrolledVehicle | null | undefined,
  vehicleId: string | null | undefined,
): boolean {
  if (!enrolled || !vehicleId) return false;
  return enrolled.id === vehicleId;
}

export function plateMatches(
  enrolled: EnrolledVehicle,
  plate: string,
): boolean {
  const entered = normalizePlate(plate);
  if (!entered || !enrolled.plate?.trim()) return false;
  return normalizePlate(enrolled.plate) === entered;
}

export function vinMatches(
  enrolled: EnrolledVehicle,
  vinOrLast6: string,
): boolean {
  const entered = vinOrLast6.trim().toUpperCase().replace(/\s/g, "");
  if (!entered) return false;
  const enrolledVin = enrolled.vin?.trim().toUpperCase();
  if (!enrolledVin) return false;
  if (entered.length === 17) return enrolledVin === entered;
  if (entered.length === 6) return enrolledVin.endsWith(entered);
  return enrolledVin.includes(entered);
}

export function checkVehicleGate(
  enrolled: EnrolledVehicle | null | undefined,
  opts: {
    vehicleId?: string | null;
    plate?: string | null;
    vin?: string | null;
    query?: string | null;
    requireExplicitConfirm?: boolean;
  },
): VehicleGateResult {
  const empty: VehicleGateResult = {
    status: "confirm_required",
    message: null,
    enrolledLabel: "—",
    enrolledPlate: null,
    enrolledVinLast6: null,
  };

  if (!enrolled) {
    return {
      ...empty,
      status: "blocked",
      message: "No enrolled vehicle on this membership.",
    };
  }

  const enrolledLabel = enrolledVehicleLabel(enrolled);
  const enrolledPlate = enrolled.plate?.trim().toUpperCase() ?? null;
  const enrolledVinLast6 = vinLast6(enrolled.vin);

  const base: VehicleGateResult = {
    status: "confirm_required",
    message: null,
    enrolledLabel,
    enrolledPlate,
    enrolledVinLast6,
  };

  if (opts.vehicleId) {
    if (vehicleIdMatches(enrolled, opts.vehicleId)) {
      return { ...base, status: "verified" };
    }
    return {
      ...base,
      status: "blocked",
      message: `This membership is for ${enrolledVehicleDetail(enrolled)}, not the vehicle you scanned.`,
    };
  }

  const plate = opts.plate?.trim() || (opts.query && isPlateOrVinQuery(opts.query) ? opts.query : null);
  const vin = opts.vin?.trim();

  if (plate) {
    if (plateMatches(enrolled, plate)) {
      return { ...base, status: "verified" };
    }
    return {
      ...base,
      status: "blocked",
      message: `This membership is for ${enrolledVehicleDetail(enrolled)}, not the vehicle you scanned (${plate.trim().toUpperCase()}).`,
    };
  }

  if (vin) {
    if (vinMatches(enrolled, vin)) {
      return { ...base, status: "verified" };
    }
    return {
      ...base,
      status: "blocked",
      message: `This membership is for ${enrolledVehicleDetail(enrolled)}, not the VIN you entered.`,
    };
  }

  if (opts.query && isPlateOrVinQuery(opts.query)) {
    return {
      ...base,
      status: "blocked",
      message: `This membership is for ${enrolledVehicleDetail(enrolled)}, not the vehicle you scanned (${opts.query.trim().toUpperCase()}).`,
    };
  }

  if (opts.requireExplicitConfirm) {
    return {
      ...base,
      status: "confirm_required",
      message: "Confirm the vehicle at the counter before redeeming benefits.",
    };
  }

  return base;
}
