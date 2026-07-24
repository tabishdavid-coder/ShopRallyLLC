/** Client-safe types for the estimate context drawer (JSON-serialized). */

export type EstimateContextDrawerAppointment = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status: string;
  vehicleLabel: string | null;
};

export type EstimateContextDrawerRo = {
  id: string;
  number: number;
  status: string;
  totalCents: number;
  createdAt: string;
  vehicleId: string | null;
  vehicleLabel: string;
  balanceCents: number | null;
};

export type EstimateContextDrawerVehicle = {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  vin: string | null;
  plate: string | null;
  plateState: string | null;
  unitNumber: string | null;
  notes: string | null;
  engine: string | null;
  transmission: string | null;
  drivetrain: string | null;
  bodyClass: string | null;
  color: string | null;
};

export type EstimateContextDrawerDetail = {
  id: string;
  firstName: string;
  lastName: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  altPhone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  tags: string[];
  notes: string | null;
  marketingOptIn: boolean;
  transactionalSmsConsent: boolean;
  marketingEmailConsent: boolean;
  deletedAt: string | null;
  anonymizedAt: string | null;
  leadSource: string | null;
  createdAt: string;
  vehicles: EstimateContextDrawerVehicle[];
  repairOrders: EstimateContextDrawerRo[];
  lifetimeTotalCents: number;
  openBalanceCents: number;
};

export type EstimateContextDrawerCarePlan = {
  id: string;
  status: string;
  planName: string;
  vehicleLabel: string;
  endsAt: string;
  progress: string;
  paymentMode: string;
};

export type EstimateContextDrawerDeferredJob = {
  id: string;
  jobName: string;
  totalCents: number;
  roId: string;
  roNumber: number;
  roStatus: string;
  vehicleLabel: string;
  deferredAt: string;
};

export type EstimateContextDrawerData = {
  detail: EstimateContextDrawerDetail;
  appointments: EstimateContextDrawerAppointment[];
  availableCreditCents: number;
  deferredJobs: EstimateContextDrawerDeferredJob[];
};
