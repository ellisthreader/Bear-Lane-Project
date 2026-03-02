import React, { createContext, useContext, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { useAvatarActions } from "./hooks/useAvatarActions";
import { useProfileEditor } from "./hooks/useProfileEditor";
import { useSavedCheckout } from "./hooks/useSavedCheckout";
import { useWishlist } from "@/Context/WishlistContext";
import type {
  ActiveTab,
  ProductPanelTab,
  ProfilePageProps,
  RecommendedProduct,
} from "./types";

type ProfileViewContextValue = {
  user: ProfilePageProps["auth"]["user"] | null;
  activeTab: ActiveTab;
  setActiveTab: React.Dispatch<React.SetStateAction<ActiveTab>>;
  productPanelTab: ProductPanelTab;
  setProductPanelTab: React.Dispatch<React.SetStateAction<ProductPanelTab>>;
  savedDesigns: NonNullable<ProfilePageProps["savedDesigns"]>;
  recommendedProducts: NonNullable<ProfilePageProps["recommendedProducts"]>;
  wishlistProducts: RecommendedProduct[];
  handleLogout: () => void;
} & ReturnType<typeof useProfileEditor>
  & ReturnType<typeof useAvatarActions>
  & ReturnType<typeof useSavedCheckout>;

const ProfileViewContext = createContext<ProfileViewContextValue | null>(null);

export function ProfileViewProvider({ children }: { children: React.ReactNode }) {
  const { auth, savedDesigns = [], recommendedProducts = [] } = usePage<ProfilePageProps>().props;
  const user = auth?.user ?? null;

  const [activeTab, setActiveTab] = useState<ActiveTab>("profile");
  const [productPanelTab, setProductPanelTab] = useState<ProductPanelTab>("recommended");

  const editor = useProfileEditor(user);
  const avatar = useAvatarActions(user);
  const savedCheckout = useSavedCheckout(user?.id);
  const { wishlist } = useWishlist();

  const wishlistProducts: RecommendedProduct[] = wishlist.map((item, index) => ({
    id: Number.parseInt(item.id, 10) || index + 1,
    name: item.name,
    brand: item.brand ?? null,
    price: typeof item.price === "number" ? item.price : null,
    image: item.image ?? null,
  }));
  const handleLogout = () => router.post("/logout");

  const value: ProfileViewContextValue = {
    user,
    activeTab,
    setActiveTab,
    productPanelTab,
    setProductPanelTab,
    savedDesigns,
    recommendedProducts,
    wishlistProducts,
    handleLogout,
    ...editor,
    ...avatar,
    ...savedCheckout,
  };

  return <ProfileViewContext.Provider value={value}>{children}</ProfileViewContext.Provider>;
}

export function useProfileViewContext() {
  const context = useContext(ProfileViewContext);
  if (!context) throw new Error("useProfileViewContext must be used within ProfileViewProvider");
  return context;
}
