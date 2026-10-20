import type { ImageState, ViewKey } from "../types/designTypes";

export const MAX_DESIGN_NAME_LENGTH = 60;
export const MAX_SAVED_DESIGNS = 10;

export const EMPTY_VIEW_IMAGE_STATES: Record<ViewKey, Record<string, ImageState>> = {
  front: {},
  back: {},
  leftSleeve: {},
  rightSleeve: {},
};

