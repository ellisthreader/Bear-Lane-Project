import type { GenderKey, MeasurementGroup } from "./types";

type Crumb = { label?: string | null };

type InferInput = {
  breadcrumbs?: Crumb[];
  productName?: string;
  productSlug?: string;
};

const menTerms = ["men", "mens", "man"];
const womenTerms = ["women", "womens", "woman", "ladies", "lady"];
const kidsTerms = ["kids", "kid", "boys", "boy", "girls", "girl", "children", "child"];

const hasAnyTerm = (value: string, terms: string[]) => terms.some((term) => value.includes(term));

const buildHaystack = ({ breadcrumbs = [], productName = "", productSlug = "" }: InferInput) =>
  [
    ...breadcrumbs.map((crumb) => String(crumb.label || "").toLowerCase()),
    String(productName).toLowerCase(),
    String(productSlug).toLowerCase(),
  ].join(" ");

export const inferSizeGuideGender = (input: InferInput): GenderKey => {
  const haystack = buildHaystack(input);

  if (hasAnyTerm(haystack, womenTerms)) return "women";
  if (hasAnyTerm(haystack, kidsTerms)) return "kids";
  if (hasAnyTerm(haystack, menTerms)) return "men";

  return "men";
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whole-word match (or substring match when the keyword itself contains a space,
 * e.g. "tote bag"). Word boundaries treat "-", "/" and "_" as separators.
 */
const keywordMatches = (haystack: string, keyword: string): boolean => {
  if (keyword.includes(" ")) return haystack.includes(keyword);
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword)}($|[^a-z0-9])`, "i");
  return pattern.test(haystack);
};

type InferGroupInput = InferInput & {
  groups?: MeasurementGroup[] | null;
};

/**
 * Picks the measurement group whose keywords best describe the product.
 * Score = total length of matched keywords, so more specific matches win
 * ("tote bag" beats "bag", which beats a stray "men" inside "women").
 * Falls back to the legacy gender inference when nothing matches.
 */
export const inferSizeGuideGroupKey = ({ groups, ...input }: InferGroupInput): string => {
  const haystack = buildHaystack(input).replace(/[-_/]+/g, " ");
  const fallback: string = inferSizeGuideGender(input);

  if (!Array.isArray(groups) || groups.length === 0) return fallback;

  let bestKey: string | null = null;
  let bestScore = 0;

  groups.forEach((group) => {
    const keywords = Array.isArray(group.keywords) ? group.keywords : [];
    const score = keywords.reduce((sum, raw) => {
      const keyword = String(raw || "").trim().toLowerCase();
      if (!keyword) return sum;
      return keywordMatches(haystack, keyword) ? sum + keyword.length : sum;
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestKey = group.key;
    }
  });

  if (bestKey) return bestKey;

  return groups.some((group) => group.key === fallback) ? fallback : groups[0].key;
};
