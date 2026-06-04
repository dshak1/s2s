import { REGIONS, type Region, type RegionId } from "@/content/regions";

export type JourneyStop = Region & {
  week: number;
  defaultCode: string;
};

const DEFAULT_CODES: Record<RegionId, string> = {
  almaty: "ALMA",
  astana: "ASTA",
  aral: "ARAL",
  charyn: "SHAR",
  mangystau: "CASP",
  karaganda: "NAN",
  shymkent: "SALM",
  turkistan: "TURK",
};

export const JOURNEY: JourneyStop[] = REGIONS.map((region, index) => ({
  ...region,
  week: index + 1,
  defaultCode: DEFAULT_CODES[region.id],
}));

export function defaultWeekCodes(): Record<RegionId, string> {
  return Object.fromEntries(JOURNEY.map((stop) => [stop.id, stop.defaultCode])) as Record<RegionId, string>;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}
