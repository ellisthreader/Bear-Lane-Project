import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { GenderValue, ProductLike, SortValue } from "../types";
import { getNumericPrice, getProductRating, inferGender } from "../utils";

type RatingValue = 0 | 3 | 4;

type FilterState = {
  searchQuery: string;
  minPrice: number;
  maxPrice: number;
  minimumRating: RatingValue;
  selectedGenders: GenderValue[];
  selectedColours: string[];
  selectedSizes: string[];
};

type CategoryFiltersContextValue = {
  filteredProducts: ProductLike[];
  sortBy: SortValue;
  setSortBy: React.Dispatch<React.SetStateAction<SortValue>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  selectedColours: string[];
  selectedSizes: string[];
  selectedGenders: GenderValue[];
  minimumRating: RatingValue;
  setMinimumRating: React.Dispatch<React.SetStateAction<RatingValue>>;
  colourOptions: string[];
  sizeOptions: string[];
  genderOptions: GenderValue[];
  minAvailable: number;
  maxAvailable: number;
  minPrice: number;
  maxPrice: number;
  setMinPrice: (value: number) => void;
  setMaxPrice: (value: number) => void;
  toggleColour: (colour: string) => void;
  toggleSize: (size: string) => void;
  toggleGender: (gender: GenderValue) => void;
  sortCounts: Record<SortValue, number>;
  ratingCounts: Record<RatingValue, number>;
  colourCounts: Record<string, number>;
  sizeCounts: Record<string, number>;
  genderCounts: Record<GenderValue, number>;
  resetFilters: () => void;
};

const CategoryFiltersContext = createContext<CategoryFiltersContextValue | null>(null);

type ProviderProps = {
  products: ProductLike[];
  pageSlug?: string;
  children: React.ReactNode;
};

const sortProducts = (products: ProductLike[], sortBy: SortValue) =>
  [...products].sort((a, b) => {
    if (sortBy === "price_desc") return getNumericPrice(b.price) - getNumericPrice(a.price);
    if (sortBy === "price_asc") return getNumericPrice(a.price) - getNumericPrice(b.price);
    if (sortBy === "new") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    if (sortBy === "rating") return getProductRating(b) - getProductRating(a);
    if (sortBy === "sale") {
      const aOnSale = getNumericPrice(a.original_price ?? null) > getNumericPrice(a.price);
      const bOnSale = getNumericPrice(b.original_price ?? null) > getNumericPrice(b.price);
      if (aOnSale !== bOnSale) return bOnSale ? 1 : -1;
      return getNumericPrice(a.price) - getNumericPrice(b.price);
    }
    return Number(b.popularity ?? b.id) - Number(a.popularity ?? a.id);
  });

export function CategoryFiltersProvider({ products, pageSlug, children }: ProviderProps) {
  const [sortBy, setSortBy] = useState<SortValue>("popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColours, setSelectedColours] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<GenderValue[]>([]);
  const [minimumRating, setMinimumRating] = useState<RatingValue>(0);

  const maxAvailable = useMemo(
    () => (products.length ? Math.max(...products.map((p) => getNumericPrice(p.price))) : 500),
    [products]
  );
  const minAvailable = 0;

  const [minPrice, setMinPrice] = useState(minAvailable);
  const [maxPrice, setMaxPrice] = useState(maxAvailable);

  useEffect(() => {
    setMinPrice(minAvailable);
    setMaxPrice(maxAvailable);
  }, [maxAvailable]);

  const colourOptions = useMemo(() => {
    const colours = new Set<string>();
    products.forEach((product) => {
      product.variants?.forEach((variant) => {
        const colour = (variant.colour || variant.color || "").trim();
        if (colour) colours.add(colour);
      });
    });
    return Array.from(colours).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const sizeOptions = useMemo(() => {
    const sizes = new Set<string>();
    products.forEach((product) => {
      product.variants?.forEach((variant) => {
        const size = (variant.size || "").trim();
        if (size) sizes.add(size);
      });
    });
    return Array.from(sizes).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const genderOptions = useMemo(() => {
    const baseOrder: GenderValue[] = ["men", "women", "kids"];
    const withData = baseOrder.filter((gender) =>
      products.some((product) => inferGender(product, pageSlug) === gender)
    );
    return withData.length > 0 ? withData : baseOrder;
  }, [products, pageSlug]);

  const currentState = useMemo<FilterState>(
    () => ({
      searchQuery,
      minPrice,
      maxPrice,
      minimumRating,
      selectedGenders,
      selectedColours,
      selectedSizes,
    }),
    [searchQuery, minPrice, maxPrice, minimumRating, selectedGenders, selectedColours, selectedSizes]
  );

  const matchesFilters = (product: ProductLike, state: FilterState) => {
    const haystack = `${product.name} ${product.brand || ""}`.toLowerCase();
    if (!haystack.includes(state.searchQuery.toLowerCase().trim())) return false;

    const price = getNumericPrice(product.price);
    if (price < state.minPrice || price > state.maxPrice) return false;

    const rating = getProductRating(product);
    if (rating < state.minimumRating) return false;

    if (state.selectedGenders.length > 0) {
      const gender = inferGender(product, pageSlug);
      if (!gender || !state.selectedGenders.includes(gender)) return false;
    }

    const productColours = new Set(
      (product.variants || [])
        .map((variant) => (variant.colour || variant.color || "").trim())
        .filter(Boolean)
    );
    const productSizes = new Set(
      (product.variants || [])
        .map((variant) => (variant.size || "").trim())
        .filter(Boolean)
    );

    if (state.selectedColours.length > 0 && !state.selectedColours.some((colour) => productColours.has(colour))) {
      return false;
    }

    if (state.selectedSizes.length > 0 && !state.selectedSizes.some((size) => productSizes.has(size))) {
      return false;
    }

    return true;
  };

  const filtered = useMemo(() => products.filter((product) => matchesFilters(product, currentState)), [products, currentState]);

  const filteredProducts = useMemo(() => {
    const sorted = sortProducts(filtered, sortBy);
    if (sorted.length > 0) return sorted;
    return sortProducts(products, sortBy);
  }, [filtered, products, sortBy]);

  const countByState = (state: FilterState) => products.filter((product) => matchesFilters(product, state)).length;
  const hasProductsForState = (state: FilterState) => countByState(state) > 0;

  const genderCounts = useMemo<Record<GenderValue, number>>(() => {
    const counts: Record<GenderValue, number> = { men: 0, women: 0, kids: 0 };
    genderOptions.forEach((gender) => {
      counts[gender] = countByState({
        ...currentState,
        selectedGenders: [gender],
      });
    });
    return counts;
  }, [genderOptions, currentState, products]);

  const colourCounts = useMemo(() => {
    return colourOptions.reduce<Record<string, number>>((acc, colour) => {
      acc[colour] = countByState({
        ...currentState,
        selectedColours: [colour],
      });
      return acc;
    }, {});
  }, [colourOptions, currentState, products]);

  const sizeCounts = useMemo(() => {
    return sizeOptions.reduce<Record<string, number>>((acc, size) => {
      acc[size] = countByState({
        ...currentState,
        selectedSizes: [size],
      });
      return acc;
    }, {});
  }, [sizeOptions, currentState, products]);

  const ratingCounts = useMemo<Record<RatingValue, number>>(() => {
    return {
      0: countByState({ ...currentState, minimumRating: 0 }),
      3: countByState({ ...currentState, minimumRating: 3 }),
      4: countByState({ ...currentState, minimumRating: 4 }),
    };
  }, [currentState, products]);

  const sortCounts = useMemo<Record<SortValue, number>>(
    () => ({
      popular: filtered.length,
      new: filtered.length,
      price_desc: filtered.length,
      price_asc: filtered.length,
      rating: filtered.length,
      sale: filtered.filter((product) => getNumericPrice(product.original_price ?? null) > getNumericPrice(product.price)).length,
    }),
    [filtered]
  );

  const toggleColour = (colour: string) => {
    const next = selectedColours.includes(colour)
      ? selectedColours.filter((item) => item !== colour)
      : [...selectedColours, colour];
    const nextCount = countByState({ ...currentState, selectedColours: next });
    if (next.length === 0 || nextCount > 0) setSelectedColours(next);
  };

  const toggleSize = (size: string) => {
    const next = selectedSizes.includes(size)
      ? selectedSizes.filter((item) => item !== size)
      : [...selectedSizes, size];
    const nextCount = countByState({ ...currentState, selectedSizes: next });
    if (next.length === 0 || nextCount > 0) setSelectedSizes(next);
  };

  const toggleGender = (gender: GenderValue) => {
    const value = gender as string;
    const current = selectedGenders as string[];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    const normalized = next as GenderValue[];
    const nextCount = countByState({ ...currentState, selectedGenders: normalized });
    if (normalized.length === 0 || nextCount > 0) setSelectedGenders(normalized);
  };

  const setMinPriceSafe = (value: number) => {
    const nextMin = Math.max(minAvailable, Math.min(Math.round(value), maxPrice));
    const nextState: FilterState = { ...currentState, minPrice: nextMin };
    if (hasProductsForState(nextState)) {
      setMinPrice(nextMin);
    }
  };

  const setMaxPriceSafe = (value: number) => {
    const nextMax = Math.min(maxAvailable, Math.max(Math.round(value), minPrice));
    const nextState: FilterState = { ...currentState, maxPrice: nextMax };
    if (hasProductsForState(nextState)) {
      setMaxPrice(nextMax);
    }
  };

  const resetFilters = () => {
    setSortBy("popular");
    setSearchQuery("");
    setSelectedColours([]);
    setSelectedSizes([]);
    setSelectedGenders([]);
    setMinimumRating(0);
    setMinPrice(minAvailable);
    setMaxPrice(maxAvailable);
  };

  const value: CategoryFiltersContextValue = {
    filteredProducts,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    selectedColours,
    selectedSizes,
    selectedGenders,
    minimumRating,
    setMinimumRating,
    colourOptions,
    sizeOptions,
    genderOptions,
    minAvailable,
    maxAvailable,
    minPrice,
    maxPrice,
    setMinPrice: setMinPriceSafe,
    setMaxPrice: setMaxPriceSafe,
    toggleColour,
    toggleSize,
    toggleGender,
    sortCounts,
    ratingCounts,
    colourCounts,
    sizeCounts,
    genderCounts,
    resetFilters,
  };

  return <CategoryFiltersContext.Provider value={value}>{children}</CategoryFiltersContext.Provider>;
}

export function useCategoryFilters() {
  const context = useContext(CategoryFiltersContext);
  if (!context) {
    throw new Error("useCategoryFilters must be used within CategoryFiltersProvider");
  }
  return context;
}
