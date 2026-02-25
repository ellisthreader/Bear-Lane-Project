import React, { useState } from "react";
import { useForm } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

export default function Products({ categories, auth }: any) {
  // 🔥 Log what the backend sends
  console.log("Frontend categories:", categories);

  const [name, setName] = useState("");
  const { post, delete: destroy, processing } = useForm();

  const addCategory = (e: any) => {
    e.preventDefault();
    post("/admin/categories", {
      data: { name },
      onSuccess: () => setName(""),
    });
  };

  const removeCategory = (id: number) => {
    destroy(`/admin/categories/${id}`);
  };

  // -------------------------------
  // ⭐ FILTERS
  // -------------------------------
  const kidsCategories = categories.filter(
    (cat: any) => cat.age_group !== null && cat.age_group !== undefined
  );

  const menCategories = categories.filter(
    (cat: any) => !cat.age_group && cat.section === "Men"
  );

  const womenCategories = categories.filter(
    (cat: any) => !cat.age_group && cat.section === "Women"
  );

  // -------------------------------
  // ⭐ GROUP HELPERS
  // -------------------------------
  const groupByAge = (items: any[]) =>
    items.reduce((acc: any, cat: any) => {
      const age = cat.age_group || "Unknown Age Group";
      if (!acc[age]) acc[age] = [];
      acc[age].push(cat);
      return acc;
    }, {});

  const groupBySection = (items: any[]) =>
    items.reduce((acc: any, cat: any) => {
      const sec = cat.section || "Unknown Section";
      if (!acc[sec]) acc[sec] = [];
      acc[sec].push(cat);
      return acc;
    }, {});

  const groupBySubsection = (items: any[]) =>
    items.reduce((acc: any, cat: any) => {
      const sub = cat.subsection || "Other";
      if (!acc[sub]) acc[sub] = [];
      acc[sub].push(cat);
      return acc;
    }, {});

  // -------------------------------
  // ⭐ OPEN STATES
  // -------------------------------
  const [openAge, setOpenAge] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);

  const [openMen, setOpenMen] = useState<string | null>(null);
  const [openWomen, setOpenWomen] = useState<string | null>(null);

  const [openProducts, setOpenProducts] = useState<number | null>(null);

  // Price formatter
  const fmtCurrency = (value: any) => {
    const num = Number(value);
    if (Number.isNaN(num)) return value ?? "";
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(num);
  };

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-10">
        <h1 className="text-4xl font-bold mb-10 text-center text-gray-900 dark:text-white">
          Manage Categories
        </h1>

        <div className="max-w-5xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
            Add Category
          </h2>

          <form onSubmit={addCategory} className="flex gap-3 mb-10">
            <input
              type="text"
              className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="Category name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              disabled={processing}
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
            >
              Add
            </button>
          </form>

          {/* ============================= */}
          {/*        KIDS CATEGORIES        */}
          {/* ============================= */}

          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
            Kids Categories
          </h2>

          <div className="space-y-5">
            {Object.keys(groupByAge(kidsCategories)).map((age) => {
              const ageMap = groupByAge(kidsCategories);
              const ageSections = groupBySection(ageMap[age] || []);

              return (
                <div
                  key={age}
                  className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-xl shadow"
                >
                  {/* AGE HEADER */}
                  <button
                    onClick={() => {
                      setOpenAge(openAge === age ? null : age);
                      setOpenSection(null);
                      setOpenSub(null);
                    }}
                    className="w-full flex justify-between items-center p-5 text-xl font-semibold text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    {age}
                    <span
                      className={`transition transform ${
                        openAge === age ? "rotate-90" : ""
                      }`}
                    >
                      ▶
                    </span>
                  </button>

                  {openAge === age && (
                    <div className="px-6 pb-4 space-y-3">
                      {Object.keys(ageSections).map((section) => {
                        const subsections = groupBySubsection(
                          ageSections[section] || []
                        );

                        return (
                          <div key={section}>
                            <button
                              onClick={() =>
                                setOpenSection(
                                  openSection === section ? null : section
                                )
                              }
                              className="w-full flex justify-between items-center p-3 text-lg bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                            >
                              {section}
                              <span
                                className={`transition transform ${
                                  openSection === section ? "rotate-90" : ""
                                }`}
                              >
                                ▶
                              </span>
                            </button>

                            {/* SUBSECTIONS */}
                            {openSection === section && (
                              <div className="ml-6 mt-2 space-y-2">
                                {Object.keys(subsections).map((sub) => (
                                  <div key={sub}>
                                    <button
                                      onClick={() =>
                                        setOpenSub(openSub === sub ? null : sub)
                                      }
                                      className="w-full flex justify-between items-center p-3 text-md bg-gray-200 dark:bg-gray-600 rounded-xl text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500 transition"
                                    >
                                      {sub}
                                      <span
                                        className={`transition transform ${
                                          openSub === sub ? "rotate-90" : ""
                                        }`}
                                      >
                                        ▶
                                      </span>
                                    </button>

                                    {openSub === sub && (
                                      <div className="ml-6 mt-2 space-y-2">
                                        {subsections[sub].map((cat: any) => (
                                          <div
                                            key={cat.id}
                                            className="p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
                                          >
                                            <div className="flex justify-between items-start">
                                              <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                  {cat.name}
                                                </p>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                                  Slug: {cat.slug}
                                                </p>
                                              </div>

                                              <div className="flex flex-col items-end gap-2">
                                                <button
                                                  onClick={() =>
                                                    setOpenProducts(
                                                      openProducts === cat.id
                                                        ? null
                                                        : cat.id
                                                    )
                                                  }
                                                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm"
                                                >
                                                  {openProducts === cat.id
                                                    ? "Hide Products"
                                                    : "Show Products"}
                                                </button>

                                                <button
                                                  onClick={() =>
                                                    removeCategory(cat.id)
                                                  }
                                                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm"
                                                >
                                                  Delete
                                                </button>
                                              </div>
                                            </div>

                                            {/* PRODUCT DROPDOWN */}
                                            {openProducts === cat.id && (
                                              <div className="mt-3 ml-3 space-y-3 border-l border-gray-300 dark:border-gray-600 pl-3">
                                                {(!cat.products ||
                                                  cat.products.length ===
                                                    0) && (
                                                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                                                    No products in this category.
                                                  </p>
                                                )}

                                                {cat.products &&
                                                  cat.products.map(
                                                    (product: any) => (
                                                      <div
                                                        key={product.id}
                                                        className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                                                      >
                                                        <div className="flex justify-between items-start">
                                                          <div>
                                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                              {
                                                                product.brand
                                                              }{" "}
                                                              —{" "}
                                                              {product.name}
                                                            </p>
                                                            <p className="text-sm text-gray-500 dark:text-gray-300">
                                                              Slug:{" "}
                                                              {product.slug}
                                                            </p>
                                                          </div>

                                                          <div className="text-right">
                                                            <p className="font-medium text-gray-900 dark:text-white">
                                                              {fmtCurrency(
                                                                product.price
                                                              )}
                                                            </p>
                                                            {product.original_price && (
                                                              <p className="text-sm line-through text-gray-500 dark:text-gray-400">
                                                                {fmtCurrency(
                                                                  product.original_price
                                                                )}
                                                              </p>
                                                            )}
                                                          </div>
                                                        </div>

                                                        {product.description && (
                                                          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                                            {
                                                              product.description
                                                            }
                                                          </p>
                                                        )}

                                                        <div className="mt-2 flex items-center gap-3">
                                                          {product.is_trending && (
                                                            <span className="text-xs bg-yellow-300 text-yellow-900 px-2 py-1 rounded-full">
                                                              Trending
                                                            </span>
                                                          )}
                                                          {product.is_sale && (
                                                            <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full">
                                                              On Sale
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>
                                                    )
                                                  )}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* MEN */}
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-gray-900 dark:text-white">
            Men Categories
          </h2>

          <div className="space-y-5">
            {Object.keys(groupBySubsection(menCategories)).map((sub) => {
              const catList = groupBySubsection(menCategories)[sub];

              return (
                <div
                  key={sub}
                  className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-xl shadow"
                >
                  <button
                    onClick={() =>
                      setOpenMen(openMen === sub ? null : sub)
                    }
                    className="w-full flex justify-between items-center p-5 text-xl font-semibold text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    {sub}
                    <span
                      className={`transition transform ${
                        openMen === sub ? "rotate-90" : ""
                      }`}
                    >
                      ▶
                    </span>
                  </button>

                  {openMen === sub && (
                    <div className="ml-6 mt-2 space-y-2">
                      {catList.map((cat: any) => (
                        <div
                          key={cat.id}
                          className="p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {cat.name}
                              </p>
                              <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Slug: {cat.slug}
                              </p>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <button
                                onClick={() =>
                                  setOpenProducts(
                                    openProducts === cat.id ? null : cat.id
                                  )
                                }
                                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm"
                              >
                                {openProducts === cat.id
                                  ? "Hide Products"
                                  : "Show Products"}
                              </button>

                              <button
                                onClick={() => removeCategory(cat.id)}
                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {openProducts === cat.id && (
                            <div className="mt-3 ml-3 space-y-3 border-l border-gray-300 dark:border-gray-600 pl-3">
                              {(!cat.products ||
                                cat.products.length === 0) && (
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                  No products in this category.
                                </p>
                              )}

                              {cat.products &&
                                cat.products.map((product: any) => (
                                  <div
                                    key={product.id}
                                    className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                          {product.brand} — {product.name}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-300">
                                          Slug: {product.slug}
                                        </p>
                                      </div>

                                      <div className="text-right">
                                        <p className="font-medium text-gray-900 dark:text-white">
                                          {fmtCurrency(product.price)}
                                        </p>
                                        {product.original_price && (
                                          <p className="text-sm line-through text-gray-500 dark:text-gray-400">
                                            {fmtCurrency(
                                              product.original_price
                                            )}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {product.description && (
                                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                        {product.description}
                                      </p>
                                    )}

                                    <div className="mt-2 flex items-center gap-3">
                                      {product.is_trending && (
                                        <span className="text-xs bg-yellow-300 text-yellow-900 px-2 py-1 rounded-full">
                                          Trending
                                        </span>
                                      )}
                                      {product.is_sale && (
                                        <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full">
                                          On Sale
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* WOMEN */}
          <h2 className="text-2xl font-semibold mt-12 mb-4 text-gray-900 dark:text-white">
            Women Categories
          </h2>

          <div className="space-y-5">
            {Object.keys(groupBySubsection(womenCategories)).map((sub) => {
              const catList = groupBySubsection(womenCategories)[sub];

              return (
                <div
                  key={sub}
                  className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-xl shadow"
                >
                  <button
                    onClick={() =>
                      setOpenWomen(openWomen === sub ? null : sub)
                    }
                    className="w-full flex justify-between items-center p-5 text-xl font-semibold text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  >
                    {sub}
                    <span
                      className={`transition transform ${
                        openWomen === sub ? "rotate-90" : ""
                      }`}
                    >
                      ▶
                    </span>
                  </button>

                  {openWomen === sub && (
                    <div className="ml-6 mt-2 space-y-2">
                      {catList.map((cat: any) => (
                        <div
                          key={cat.id}
                          className="p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {cat.name}
                              </p>
                              <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Slug: {cat.slug}
                              </p>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <button
                                onClick={() =>
                                  setOpenProducts(
                                    openProducts === cat.id ? null : cat.id
                                  )
                                }
                                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm"
                              >
                                {openProducts === cat.id
                                  ? "Hide Products"
                                  : "Show Products"}
                              </button>

                              <button
                                onClick={() => removeCategory(cat.id)}
                                className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          {openProducts === cat.id && (
                            <div className="mt-3 ml-3 space-y-3 border-l border-gray-300 dark:border-gray-600 pl-3">
                              {(!cat.products ||
                                cat.products.length === 0) && (
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                  No products in this category.
                                </p>
                              )}

                              {cat.products &&
                                cat.products.map((product: any) => (
                                  <div
                                    key={product.id}
                                    className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                          {product.brand} — {product.name}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-300">
                                          Slug: {product.slug}
                                        </p>
                                      </div>

                                      <div className="text-right">
                                        <p className="font-medium text-gray-900 dark:text-white">
                                          {fmtCurrency(product.price)}
                                        </p>
                                        {product.original_price && (
                                          <p className="text-sm line-through text-gray-500 dark:text-gray-400">
                                            {fmtCurrency(
                                              product.original_price
                                            )}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {product.description && (
                                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                        {product.description}
                                      </p>
                                    )}

                                    <div className="mt-2 flex items-center gap-3">
                                      {product.is_trending && (
                                        <span className="text-xs bg-yellow-300 text-yellow-900 px-2 py-1 rounded-full">
                                          Trending
                                        </span>
                                      )}
                                      {product.is_sale && (
                                        <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full">
                                          On Sale
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
