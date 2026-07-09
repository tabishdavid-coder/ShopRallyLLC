export type SeoCrmOutcomesView = {
  days: number;
  onlineAppointments: number;
  priorOnlineAppointments: number;
  onlineAppointmentsDeltaPct: number | null;
  newWebCustomers: number;
  priorNewWebCustomers: number;
  newWebCustomersDeltaPct: number | null;
  websiteRepairOrders: number;
  priorWebsiteRepairOrders: number;
  websiteRepairOrdersDeltaPct: number | null;
  onlineBookingEnabled: boolean;
};

export type SeoSiteTrafficView = {
  ga4MeasurementId: string | null;
  ga4Configured: boolean;
  sitePublished: boolean;
  siteUrl: string | null;
};
