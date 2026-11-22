/** Central print-template selection. Add official sport templates here when received.
 * A generic receipt stays available for every sport in the meantime. */
export type SportsPrintTemplate = "rov-official" | "generic";

const templatesByEventCode: Record<string, SportsPrintTemplate> = {
  "GS3-ES-SM": "rov-official",
  "GS3-ES-SF": "rov-official",
};

export function sportsPrintTemplateFor(eventCode: string | null | undefined): SportsPrintTemplate {
  return templatesByEventCode[eventCode || ""] || "generic";
}
