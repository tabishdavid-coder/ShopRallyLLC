/** Shop settings for auto-archiving completed job board cards. */

export const COMPLETED_RO_ARCHIVE_DAY_OPTIONS = [7, 14, 30, 45, 60, 90] as const;

export type CompletedRoArchiveDayOption = (typeof COMPLETED_RO_ARCHIVE_DAY_OPTIONS)[number];

export type CompletedRoArchiveSettings = {
  enabled: boolean;
  days: CompletedRoArchiveDayOption;
};

export const COMPLETED_RO_ARCHIVE_DEFAULTS: CompletedRoArchiveSettings = {
  enabled: true,
  days: 30,
};

export function resolveCompletedRoArchiveSettings(shop: {
  completedRoAutoArchiveEnabled: boolean;
  completedRoAutoArchiveDays: number;
}): CompletedRoArchiveSettings {
  const daysRaw = shop.completedRoAutoArchiveDays;
  const days = (COMPLETED_RO_ARCHIVE_DAY_OPTIONS as readonly number[]).includes(daysRaw)
    ? (daysRaw as CompletedRoArchiveDayOption)
    : COMPLETED_RO_ARCHIVE_DEFAULTS.days;
  return {
    enabled: shop.completedRoAutoArchiveEnabled,
    days,
  };
}
