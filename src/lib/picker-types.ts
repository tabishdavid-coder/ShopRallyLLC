/** Customer row returned by type-ahead pickers (Create RO, appointments, etc.). */
export type CustomerPick = {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  roCount: number;
  /** ISO string from server actions (Date is not serializable over the wire). */
  lastVisitAt: string | null;
  vehicleHint: string | null;
};

export type VehiclePick = {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
  vin: string | null;
  plate: string | null;
  plateState: string | null;
};
