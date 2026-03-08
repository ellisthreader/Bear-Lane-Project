import { useMemo } from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import CategoryBreadcrumb from "./CategoryPage/components/CategoryBreadcrumb";
import CategoryFiltersSidebar from "./CategoryPage/components/CategoryFiltersSidebar";
import CategoryProductsGrid from "./CategoryPage/components/CategoryProductsGrid";
import { CategoryFiltersProvider } from "./CategoryPage/context/CategoryFiltersContext";
import { BreadcrumbItem, CategoryPageProps } from "./CategoryPage/types";
import { formatLabel } from "./CategoryPage/utils";

const buildTitle = (heading: string | undefined, subcategory: string | undefined, pathParts: string[]) => {
  const rootPart = (pathParts[0] || "").toLowerCase();
  if (pathParts.length === 1) {
    if (rootPart === "men") return "All Men's Products";
    if (rootPart === "women") return "All Women's Products";
    if (rootPart === "kids") return "All Kids' Products";
    if (rootPart === "sale") return "All Sale Products";
  }

  if (heading && subcategory && heading.toLowerCase() !== "navigation") {
    const root = heading.toLowerCase();
    const leaf = formatLabel(subcategory);
    if (root === "men") return `Men's ${leaf}`;
    if (root === "women") return `Women's ${leaf}`;
    return `${formatLabel(heading)} ${leaf}`;
  }

  const root = formatLabel(pathParts[0] || "");
  const leaf = formatLabel(pathParts[pathParts.length - 1] || "Category");
  if (root.toLowerCase() === "men") return `Men's ${leaf}`;
  if (root.toLowerCase() === "women") return `Women's ${leaf}`;
  return `${root} ${leaf}`.trim();
};

export default function CategoryPage({ heading, subcategory, slug, products, category_id }: CategoryPageProps) {
  const page = usePage<{ auth?: { user?: { is_admin?: boolean } } }>();
  const isAdmin = Boolean(page.props.auth?.user?.is_admin);
  const pathParts = useMemo(() => slug.split("/").filter(Boolean), [slug]);
  const queryParams = useMemo(() => new URLSearchParams((page.url.split("?")[1] ?? "").trim()), [page.url]);
  const isProductEditMode = isAdmin && queryParams.get("product_mode") === "1";

  const breadcrumbItems = useMemo<BreadcrumbItem[]>(
    () =>
      pathParts.map((part, index) => ({
        label: formatLabel(part),
        href: `/category/${pathParts.slice(0, index + 1).join("/")}`,
        isLast: index === pathParts.length - 1,
      })),
    [pathParts]
  );

  const title = useMemo(() => buildTitle(heading, subcategory, pathParts), [heading, subcategory, pathParts]);

  return (
    <AuthenticatedLayout
      containerClassName="min-h-screen w-full flex flex-col bg-white"
      contentClassName="flex-1 w-full overflow-visible"
    >
      <Head title={title} />

      <CategoryFiltersProvider products={products} pageSlug={slug}>
        <div className="w-full bg-white px-4 pb-10 pt-3 md:px-6 lg:px-8">
          <CategoryBreadcrumb title={title} items={breadcrumbItems} />
          {isAdmin && !isProductEditMode ? (
            <div className="mb-4 flex justify-end">
              <Link
                href={`/category/${slug}?product_mode=1`}
                className="inline-flex items-center rounded-xl border border-[#D7BE84] bg-[#FFF8E8] px-4 py-2 text-sm font-semibold text-[#7B6530] transition hover:border-[#C8951E] hover:bg-[#FFF2D7]"
              >
                Start Editing Page
              </Link>
            </div>
          ) : null}

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
            <CategoryFiltersSidebar />
            <section className="min-h-[60vh] lg:min-w-0 lg:flex-1">
              {isProductEditMode ? (
                <div className="mb-4 rounded-xl border-2 border-[#C8951E] bg-[#FFF8E8] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A5F00]">Admin Only</p>
                  <h2 className="mt-1 text-lg font-extrabold text-[#2A241B]">PRODUCT EDIT MODE</h2>
                  <p className="mt-1 text-sm text-[#5D4A1E]">
                    You can manage product cards here: add, edit, and delete controls are visible in this mode.
                  </p>
                </div>
              ) : null}
              <CategoryProductsGrid
                productEditMode={isProductEditMode}
                categoryId={category_id ?? null}
                categorySlug={slug}
              />
            </section>
          </div>
        </div>
      </CategoryFiltersProvider>
    </AuthenticatedLayout>
  );
}
