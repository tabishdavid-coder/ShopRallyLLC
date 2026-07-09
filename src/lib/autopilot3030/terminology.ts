/**
 * UI copy layer — routes and DB enums stay unchanged.
 * Operations nav uses industry-standard shop CRM labels (Tekmetric/AutoLeap conventions).
 */

export const AP_TERMS = {
  repairOrder: "Repair Order",
  repairOrders: "Repair Orders",
  jobBoard: "Job Board",
  techBoard: "Tech Board",
  quickLabor: "Labor Book",
  cannedJobs: "Service Templates",
  smartJobs: "Work Lines",
  estimate: "Quote",
  workInProgress: "Active Bay",
  buildEstimate: "Finalize Quote",
  growthEngine: "Growth Engine",
  maintenancePrograms: "Care Plans",
  maintenanceSubscribers: "Care Plan Members",
  shopSettings: "Shop Configuration",
  roSettings: "RO Defaults",
  shopProfile: "Shop Identity",
  newRepairOrder: "New Repair Order",
  newRepairOrderShort: "+ RO",
  buildServiceTicket: "Build Repair Order",
} as const;
