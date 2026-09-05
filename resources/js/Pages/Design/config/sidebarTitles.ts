import type { ImageState } from "../types/designTypes";

type SidebarTitleResolverArgs = {
  selectedText: string | null;
  selectedUploadedImage: string | null;
  currentImageState: Record<string, ImageState>;
};

type SidebarTitleResolver = (args: SidebarTitleResolverArgs) => string;

const SIDEBAR_TITLES: Record<string, string | SidebarTitleResolver> = {
  product: "Product",
  text: ({ selectedText }) => (selectedText ? "Text Properties" : "Text"),
  clipart: ({ selectedUploadedImage, currentImageState }) =>
    selectedUploadedImage && currentImageState[selectedUploadedImage]?.isClipart
      ? "Clipart Properties"
      : "Clipart",
  upload: "Upload",
};

export function getSidebarTitle({
  activeSidebar,
  selectedObjectsCount,
  sidebarTitleOverride,
  selectedText,
  selectedUploadedImage,
  currentImageState,
  isUserSignedIn,
}: {
  activeSidebar: string;
  selectedObjectsCount: number;
  sidebarTitleOverride: string | null;
  selectedText: string | null;
  selectedUploadedImage: string | null;
  currentImageState: Record<string, ImageState>;
  isUserSignedIn: boolean;
}): string {
  if (selectedObjectsCount > 1) return "Multiple Objects Selected";
  if (sidebarTitleOverride) return sidebarTitleOverride;
  if (activeSidebar === "my-designs") return isUserSignedIn ? "My Designs" : "Sign in to access";

  const titleResolver = SIDEBAR_TITLES[activeSidebar];
  if (typeof titleResolver === "function") {
    return titleResolver({ selectedText, selectedUploadedImage, currentImageState });
  }
  return titleResolver ?? "";
}

