/**
 * Maps the `property` block of a ZapTask asset onto the listing shape the UI
 * consumes, honouring the agent's per-section visibility toggles so hidden
 * details never leave the server.
 */

import type { ListingType, PropertyListing } from "./types";
import type { ZapTaskAsset, ZapTaskListing, ZapTaskListingVisibilityKey } from "./zaptask";

export interface ListingFacts {
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  receptions: number | null;
  tenure: string | null;
  furnishing: string | null;
  listed: boolean;
  listing: PropertyListing | null;
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInt(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toListingType(value: string | null | undefined): ListingType | null {
  return value === "rent" || value === "sale" ? value : null;
}

/**
 * Normalises a price so rentals quoted pw/pa can be compared with pcm ones.
 * Sales figures are returned as-is; POA and blank prices have no comparable.
 */
export function comparablePrice(
  amount: number | null,
  qualifier: string | null,
  listingType: ListingType | null,
): number | null {
  if (amount === null || qualifier === "poa") return null;
  if (listingType === "sale") return amount;
  switch (qualifier) {
    case "pw":
      return Math.round((amount * 52) / 12);
    case "pa":
      return Math.round(amount / 12);
    default:
      return amount;
  }
}

function isVisible(listing: ZapTaskListing | undefined, key: ZapTaskListingVisibilityKey): boolean {
  const flag = listing?.visibility?.[key];
  return flag === undefined || flag === null ? true : Boolean(flag);
}

function hasAnyListingDetail(listing: PropertyListing): boolean {
  return (
    listing.listingType !== null ||
    listing.priceLabel !== null ||
    listing.depositAmount !== null ||
    listing.availableFrom !== null ||
    listing.councilTaxBand !== null ||
    listing.epcRating !== null ||
    listing.broadband !== null ||
    listing.keyFeatures.length > 0 ||
    listing.description !== null
  );
}

export function listingFactsFromAsset(asset: ZapTaskAsset): ListingFacts {
  const property = asset.property;
  const raw = property?.listing;
  const show = (key: ZapTaskListingVisibilityKey) => isVisible(raw, key);

  const listingType = toListingType(raw?.listing_type);
  const priceQualifier = show("price") ? blankToNull(raw?.price_qualifier) : null;
  const priceAmount = show("price") ? toNumber(raw?.price_amount) : null;
  const priceLabel = show("price")
    ? blankToNull(raw?.price_label) ?? formatPrice(priceAmount, priceQualifier)
    : null;

  const keyFeatures = show("features")
    ? (raw?.key_features ?? []).map((f) => f.trim()).filter(Boolean)
    : [];

  const listing: PropertyListing = {
    listingType,
    priceAmount,
    priceQualifier,
    priceLabel,
    comparablePrice: comparablePrice(priceAmount, priceQualifier, listingType),
    depositAmount: show("deposit") ? toNumber(raw?.deposit_amount) : null,
    availableFrom: show("available_from") ? blankToNull(raw?.available_from) : null,
    councilTaxBand: show("council_tax") ? blankToNull(raw?.council_tax_band) : null,
    epcRating: show("epc") ? blankToNull(raw?.epc_rating)?.toUpperCase() ?? null : null,
    broadband: show("broadband") ? blankToNull(raw?.broadband) : null,
    keyFeatures,
    description: show("description") ? blankToNull(raw?.description) : null,
  };

  return {
    propertyType: show("property_type") ? blankToNull(property?.property_type) : null,
    bedrooms: show("bedrooms") ? toInt(property?.bedrooms) : null,
    bathrooms: show("bathrooms") ? toInt(property?.bathrooms) : null,
    receptions: show("receptions") ? toInt(property?.receptions) : null,
    tenure: show("tenure") ? blankToNull(property?.tenure) : null,
    furnishing: show("furnishing") ? blankToNull(property?.furnishing) : null,
    listed: Boolean(raw?.show_on_zapproperty),
    listing: hasAnyListingDetail(listing) ? listing : null,
  };
}

/**
 * Fallback formatter matching `PropertyListing::formatPrice()` on the
 * platform, used only when the API omits `price_label`.
 */
export function formatPrice(amount: number | null, qualifier: string | null): string | null {
  if (qualifier === "poa") return "POA";
  if (amount === null) return null;

  const formatted = formatMoney(amount);
  switch (qualifier) {
    case "pcm":
      return `${formatted} pcm`;
    case "pw":
      return `${formatted} pw`;
    case "pa":
      return `${formatted} pa`;
    case "guide":
      return `Guide price ${formatted}`;
    case "offers_over":
      return `Offers over ${formatted}`;
    case "offers_in_excess":
      return `Offers in excess of ${formatted}`;
    default:
      return formatted;
  }
}

export function formatMoney(amount: number | null): string | null {
  if (amount === null) return null;
  const whole = Number.isInteger(amount);
  return `£${amount.toLocaleString("en-GB", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}
