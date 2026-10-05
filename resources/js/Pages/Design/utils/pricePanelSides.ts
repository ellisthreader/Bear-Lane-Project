import type { PricePreviewSnapshot } from "../Canvas/Canvas";
import type { ViewImages, ViewKey } from "../types/designTypes";

type SideStatus = {
  key: ViewKey;
  pictureNumber: 1 | 2 | 3 | 4;
  label: string;
  edited: boolean;
  imageSrc?: string;
  preview?: PricePreviewSnapshot;
};

export const buildPricePanelSides = (
  viewImageStates: Record<ViewKey, Record<string, unknown>>,
  viewImages: ViewImages,
  pricePreviewByView: Record<ViewKey, PricePreviewSnapshot | undefined>
): SideStatus[] => [
  {
    key: "front",
    pictureNumber: 1,
    label: "Front",
    edited: Object.keys(viewImageStates.front ?? {}).length > 0,
    imageSrc: viewImages.front,
    preview: pricePreviewByView.front,
  },
  {
    key: "back",
    pictureNumber: 2,
    label: "Back",
    edited: Object.keys(viewImageStates.back ?? {}).length > 0,
    imageSrc: viewImages.back,
    preview: pricePreviewByView.back,
  },
  {
    key: "rightSleeve",
    pictureNumber: 3,
    label: "Right Sleeve",
    edited: Object.keys(viewImageStates.rightSleeve ?? {}).length > 0,
    imageSrc: viewImages.rightSleeve,
    preview: pricePreviewByView.rightSleeve,
  },
  {
    key: "leftSleeve",
    pictureNumber: 4,
    label: "Left Sleeve",
    edited: Object.keys(viewImageStates.leftSleeve ?? {}).length > 0,
    imageSrc: viewImages.leftSleeve,
    preview: pricePreviewByView.leftSleeve,
  },
];
