// C:\dev\highrise-pk\lib\trueCostCalculator.ts

export type ListingType = "full_payment" | "rent" | "installment";

export type TrueCostLineItem = {
  key: string;
  label: string;
  amount: number; // PKR
  note?: string;
};

export type TrueCostBreakdown = {
  listingType: ListingType;
  currency: "PKR";
  baseLabel: string;
  baseAmount: number;
  items: TrueCostLineItem[];
  subtotal: number;
  total: number;
  disclaimer: string;
};

function toSafeNumber(val: unknown): number {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/,/g, "").trim();
    const n = Number(cleaned);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function nonNegative(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n;
}

function pushIfPositive(items: TrueCostLineItem[], item: TrueCostLineItem) {
  const amt = nonNegative(toSafeNumber(item.amount));
  if (amt > 0) items.push({ ...item, amount: amt });
}

/**
 * ✅ IMPORTANT:
 * Ye input type API se pass honay wali keys ko EXACTLY accept karta hai,
 * taa-ke aapke screenshot wali redlines khatam ho jayein.
 */
export type TrueCostInput = {
  listingType: ListingType;

  // Base pricing
  price?: unknown; // sell/installment total price
  rent?: unknown; // monthly rent
  securityDeposit?: unknown; // PKR amount

  // Charges (PKR)
  taxes?: unknown;
  governmentCharges?: unknown;
  transferCharges?: unknown;
  maintenance?: unknown;

  // Optional extras
  hiddenChargesTotal?: unknown;
};

export function calculateTrueCost(input: TrueCostInput): TrueCostBreakdown {
  const listingType = input.listingType;

  const taxes = nonNegative(toSafeNumber(input.taxes));
  const governmentCharges = nonNegative(toSafeNumber(input.governmentCharges));
  const transferCharges = nonNegative(toSafeNumber(input.transferCharges));
  const maintenance = nonNegative(toSafeNumber(input.maintenance));
  const hiddenChargesTotal = nonNegative(toSafeNumber(input.hiddenChargesTotal));

  const items: TrueCostLineItem[] = [];

  pushIfPositive(items, { key: "taxes", label: "Taxes", amount: taxes });
  pushIfPositive(items, { key: "governmentCharges", label: "Government charges", amount: governmentCharges });
  pushIfPositive(items, { key: "transferCharges", label: "Transfer charges", amount: transferCharges });
  pushIfPositive(items, { key: "maintenance", label: "Maintenance", amount: maintenance });
  pushIfPositive(items, { key: "hiddenCharges", label: "Other / hidden charges", amount: hiddenChargesTotal });

  let baseLabel = "Base price";
  let baseAmount = 0;

  if (listingType === "full_payment") {
    baseLabel = "Property price";
    baseAmount = nonNegative(toSafeNumber(input.price));
  } else if (listingType === "installment") {
    baseLabel = "Total price (as listed)";
    baseAmount = nonNegative(toSafeNumber(input.price));
    // Phase 2 mein downpayment + monthly schedule break hoga (installment fields se)
  } else {
    baseLabel = "Monthly rent";
    baseAmount = nonNegative(toSafeNumber(input.rent));

    const securityDeposit = nonNegative(toSafeNumber(input.securityDeposit));
    pushIfPositive(items, {
      key: "securityDeposit",
      label: "Security deposit",
      amount: securityDeposit,
      note: "One-time (refundable depends on contract)",
    });
  }

  const subtotal = baseAmount + items.reduce((sum, i) => sum + nonNegative(toSafeNumber(i.amount)), 0);
  const total = subtotal;

  return {
    listingType,
    currency: "PKR",
    baseLabel,
    baseAmount,
    items,
    subtotal,
    total,
    disclaimer:
      "Estimates only. Actual payable amounts depend on location, authority rules, property documentation, and negotiated terms. Always verify with your agent/lawyer and official challans/receipts.",
  };
}
