import type { GenderKey } from "./types";

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

export const inferSizeGuideGender = ({ breadcrumbs = [], productName = "", productSlug = "" }: InferInput): GenderKey => {
  const haystack = [
    ...breadcrumbs.map((crumb) => String(crumb.label || "").toLowerCase()),
    String(productName).toLowerCase(),
    String(productSlug).toLowerCase(),
  ].join(" ");

  if (hasAnyTerm(haystack, womenTerms)) return "women";
  if (hasAnyTerm(haystack, kidsTerms)) return "kids";
  if (hasAnyTerm(haystack, menTerms)) return "men";

  return "men";
};
