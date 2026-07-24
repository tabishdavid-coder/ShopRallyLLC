/** Default OEM scraper source configs — seeded into ScraperSource. */

export type ScraperSourceSeed = {
  sourceName: string;
  baseUrl: string;
  priority: number;
  endpoints: Record<string, string>;
  selectors: Record<string, string>;
};

export const DEFAULT_SCRAPER_SOURCES: ScraperSourceSeed[] = [
  {
    sourceName: "partsouq",
    baseUrl: "https://partsouq.com",
    priority: 1,
    endpoints: {
      health: "/en/catalog/genuine/locate?c=Honda",
      catalog: "/en/catalog/genuine/parts?c={make}&model={model}&year={year}",
      search: "/en/search?q={make}+{model}+{year}",
    },
    selectors: {
      health_marker: "catalog",
      result_marker: "part-number",
      title: "h1",
    },
  },
  {
    sourceName: "7zap",
    baseUrl: "https://www.7zap.com",
    priority: 2,
    endpoints: {
      health: "/en/catalog/",
      catalog: "/en/catalog/{make}/{model}/{year}/",
      search: "/en/search/?q={make}+{model}",
    },
    selectors: {
      health_marker: "catalog",
      result_marker: "article",
    },
  },
  {
    sourceName: "fordparts",
    baseUrl: "https://www.fordparts.com",
    priority: 3,
    endpoints: {
      health: "/",
      catalog: "/v/{year}/{make}/{model}",
      search: "/search?q={model}",
    },
    selectors: {
      health_marker: "Ford",
      result_marker: "product",
    },
  },
  {
    sourceName: "fluidcapacity",
    baseUrl: "https://www.fluidcapacity.com",
    priority: 4,
    endpoints: {
      health: "/",
      fluids: "/vehicle/{year}/{make}/{model}/fluids",
      catalog: "/vehicle/{year}/{make}/{model}",
    },
    selectors: {
      health_marker: "fluid",
      result_marker: "capacity",
    },
  },
  {
    sourceName: "nhtsa_vpic",
    baseUrl: "https://vpic.nhtsa.dot.gov/api",
    priority: 5,
    endpoints: {
      health: "/vehicles/DecodeVin/{vin}?format=json",
      catalog: "/vehicles/DecodeVin/{vin}?format=json",
    },
    selectors: {
      health_marker: "Results",
      result_marker: "Make",
    },
  },
];

export const OEM_HEALTH_PROBE = {
  year: 2014,
  make: "Honda",
  model: "Accord",
  vin: "1HGCM82633A004352",
};

export const OEM_AUTOMATION_JOBS = [
  "quarterly_scrape",
  "daily_telemetry_update",
  "daily_health_check",
] as const;

export type OemAutomationJobName = (typeof OEM_AUTOMATION_JOBS)[number];

/** Platform OEM automation UI — off in production unless explicitly enabled. */
export function isPlatformOemAutomationUiEnabled(): boolean {
  if (process.env.PLATFORM_OEM_AUTOMATION_UI === "true") return true;
  if (process.env.PLATFORM_OEM_AUTOMATION_UI === "false") return false;
  return process.env.NODE_ENV === "development";
}
