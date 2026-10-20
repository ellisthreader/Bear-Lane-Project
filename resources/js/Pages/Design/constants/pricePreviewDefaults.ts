import type { PricePreviewSnapshot } from "../Canvas/Canvas";
import type { ViewKey } from "../types/designTypes";

export const createEmptyPricePreviewByView = (): Record<ViewKey, PricePreviewSnapshot | undefined> => ({
  front: undefined,
  back: undefined,
  leftSleeve: undefined,
  rightSleeve: undefined,
});
