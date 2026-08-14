import { z } from "zod";

const optionalQuantity = z.coerce.number().finite().min(0).max(100_000_000).optional();

const updateExitQuantitiesSchema = z.object({
  expectedVersion: z.number().int().positive(),
  lockNumber: z.string().trim().max(50).optional(),
  qtyMs: optionalQuantity,
  qtyXpms: optionalQuantity,
  qtyEbms: optionalQuantity,
  qtyHsd: optionalQuantity,
  qtySko: optionalQuantity,
  qtyXg: optionalQuantity,
  qtyBioHsd: optionalQuantity,
  qtyFo: optionalQuantity,
  qtyLdo: optionalQuantity,
}).strict().refine(
  (value) => [value.qtyMs, value.qtyXpms, value.qtyEbms, value.qtyHsd, value.qtySko, value.qtyXg, value.qtyBioHsd, value.qtyFo, value.qtyLdo, value.lockNumber].some((item) => item !== undefined),
  "Provide at least one quantity or lock number to update",
);

const payload = {
  "expectedVersion": 1,
  "qtyMs": 0,
  "qtyXpms": 0,
  "qtyEbms": 0,
  "qtyHsd": 0,
  "qtySko": 0,
  "qtyXg": 0,
  "qtyBioHsd": 0,
  "qtyFo": 0,
  "qtyLdo": 0,
  "lockNumber": ""
};

const result = updateExitQuantitiesSchema.safeParse(payload);
console.log(JSON.stringify(result, null, 2));
