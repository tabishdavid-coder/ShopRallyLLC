/** Client-safe Google Business Profile types for the reviews connect UI. */

export type GoogleBusinessAccount = {
  accountId: string;
  displayName: string;
};

export type GoogleBusinessLocation = {
  locationId: string;
  displayName: string;
  placeId: string | null;
  addressLine: string | null;
};
