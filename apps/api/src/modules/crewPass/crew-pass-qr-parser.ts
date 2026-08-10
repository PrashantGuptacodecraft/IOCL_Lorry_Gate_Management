import crypto from "node:crypto";
import { CrewType } from "@prisma/client";
import { ApiError } from "../../lib/api-error.js";

const MAX_QR_LENGTH = 2_000;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

type FieldKey = "crewId" | "driverName" | "crewType" | "passValidUntil" | "ttNumberOnPass" | "drivingLicenseNumber" | "drivingLicenseExpiryDate";
const fields: Array<{ key: FieldKey; label: string; patterns: RegExp[] }> = [
  { key: "crewId", label: "Crew Id", patterns: [/^crew\s*id\s*:\s*(.*)$/i] },
  { key: "driverName", label: "Name", patterns: [/^name\s*:\s*(.*)$/i] },
  { key: "crewType", label: "Crew Type", patterns: [/^crew\s*type\s*:\s*(.*)$/i] },
  { key: "passValidUntil", label: "Pass Valid Upto", patterns: [/^pass\s*valid\s*(?:upto|up\s*to|until)\s*:\s*(.*)$/i] },
  { key: "ttNumberOnPass", label: "TT No", patterns: [/^tt\s*(?:no|number)\s*:\s*(.*)$/i] },
  { key: "drivingLicenseNumber", label: "DL No", patterns: [/^dl\s*(?:no|number)\s*:\s*(.*)$/i, /^driving\s*licen[cs]e\s*(?:no|number)\s*:\s*(.*)$/i] },
  { key: "drivingLicenseExpiryDate", label: "DL Expiry Date", patterns: [/^dl\s*expiry\s*(?:date)?\s*:\s*(.*)$/i, /^driving\s*licen[cs]e\s*expiry\s*(?:date)?\s*:\s*(.*)$/i] },
];

export function looksLikeCrewPassQr(rawPayload: string) {
  return /(?:^|\r?\n)\s*crew\s*id\s*:/i.test(rawPayload) || /(?:^|\r?\n)\s*crew\s*type\s*:/i.test(rawPayload);
}

function parseStrictDate(value: string, fieldLabel: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) throw new ApiError(400, "QR_INVALID_DATE", `${fieldLabel} must use DD/MM/YYYY`);
  const day = Number(match[1]); const month = Number(match[2]); const year = Number(match[3]);
  if (year < 2000 || year > 2100) throw new ApiError(400, "QR_INVALID_DATE", `${fieldLabel} contains an unsupported year`);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new ApiError(400, "QR_INVALID_DATE", `${fieldLabel} is not a valid calendar date`);
  }
  return date;
}

function mapCrewType(raw: string) {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (normalized === "driver") return CrewType.DRIVER;
  if (normalized === "driver with helper") return CrewType.DRIVER_WITH_HELPER;
  if (normalized === "contract crew") return CrewType.CONTRACT_CREW;
  throw new ApiError(400, "QR_INVALID_CREW_TYPE", "The QR contains an unsupported crew type");
}

export function parseCrewPassQr(rawPayload: string) {
  if (typeof rawPayload !== "string" || !rawPayload.trim()) throw new ApiError(400, "QR_EMPTY", "Scan or enter a crew-pass QR");
  if (Buffer.byteLength(rawPayload, "utf8") > MAX_QR_LENGTH) throw new ApiError(400, "QR_TOO_LONG", "The crew-pass QR is larger than the supported limit");
  if (CONTROL_CHARACTERS.test(rawPayload)) throw new ApiError(400, "QR_CONTROL_CHARACTERS", "The crew-pass QR contains unsupported control characters");

  const lines = rawPayload.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n").map((line) => line.trim()).filter(Boolean);
  const extracted = new Map<FieldKey, string>();
  for (const definition of fields) {
    const matches: string[] = [];
    for (const line of lines) {
      for (const pattern of definition.patterns) {
        const match = pattern.exec(line);
        if (match) { matches.push((match[1] ?? "").trim()); break; }
      }
    }
    if (matches.length === 0) throw new ApiError(400, "QR_MISSING_FIELD", `Missing required field: ${definition.label}`);
    if (matches.length > 1) throw new ApiError(400, "QR_DUPLICATE_FIELD", `Duplicate required field: ${definition.label}`);
    if (!matches[0]) throw new ApiError(400, "QR_EMPTY_FIELD", `Empty required field: ${definition.label}`);
    extracted.set(definition.key, matches[0]);
  }

  const crewId = extracted.get("crewId")!.replace(/\s+/g, "").toUpperCase();
  const driverName = extracted.get("driverName")!.replace(/\s+/g, " ").trim();
  const ttNumberOnPass = extracted.get("ttNumberOnPass")!.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const drivingLicenseNumber = extracted.get("drivingLicenseNumber")!.replace(/\s+/g, "").trim();
  if (!/^[A-Z0-9]{6,50}$/.test(crewId)) throw new ApiError(400, "QR_INVALID_CREW_ID", "The QR contains an invalid crew ID");
  if (!/^[\p{L} .'-]{2,120}$/u.test(driverName)) throw new ApiError(400, "QR_INVALID_NAME", "The QR contains an invalid driver name");
  if (!/^[A-Z0-9]{6,15}$/.test(ttNumberOnPass) || !/[A-Z]/.test(ttNumberOnPass) || !/\d/.test(ttNumberOnPass)) throw new ApiError(400, "QR_INVALID_TT_NUMBER", "The QR contains an invalid TT number");
  if (!/^[A-Za-z0-9./_-]{4,40}$/.test(drivingLicenseNumber)) throw new ApiError(400, "QR_INVALID_LICENCE_NUMBER", "The QR contains an invalid driving licence number");

  const crewType = mapCrewType(extracted.get("crewType")!);
  const passValidUntil = parseStrictDate(extracted.get("passValidUntil")!, "Pass Valid Upto");
  const drivingLicenseExpiryDate = parseStrictDate(extracted.get("drivingLicenseExpiryDate")!, "DL Expiry Date");
  const displayDate = (date: Date) =>
    `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
  const normalizedRawPayload = [
    `Crew Id:${crewId}`,
    `Name:${driverName}`,
    `Crew Type:${crewType}`,
    `Pass Valid Upto:${displayDate(passValidUntil)}`,
    `TT No:${ttNumberOnPass}`,
    `DL No:${drivingLicenseNumber.toUpperCase()}`,
    `DL Expiry Date:${displayDate(drivingLicenseExpiryDate)}`,
  ].join("\n");
  return {
    crewId,
    driverName,
    crewType,
    passValidUntil,
    ttNumberOnPass,
    drivingLicenseNumber,
    drivingLicenseExpiryDate,
    normalizedRawPayload,
    payloadHash: crypto.createHash("sha256").update(normalizedRawPayload, "utf8").digest("hex"),
  };
}
