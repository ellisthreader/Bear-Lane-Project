import React from "react";
import OrdersTab from "../../OrdersTab";

export default function OrdersHistoryTab() {
  const [sortBy, setSortBy] = React.useState<"newest" | "oldest">("newest");

  return (
    <section className="rounded-3xl border border-[#E2D2A8] bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6 rounded-2xl border border-[#E9DDBE] bg-[#FFFCF4] p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-[#251E11]">Order History</h2>
            <p className="mt-1 text-sm text-[#7A6C4D]">Pick up where you left off, rename, remove, or checkout selected designs faster.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-[#7B6530]">
            <span className="font-semibold">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
              className="h-10 min-w-[168px] rounded-xl border border-[#D8C392] bg-white px-3 text-sm text-[#5D4C28] outline-none transition focus:border-[#C6A75E]"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </label>
        </div>
      </div>
      <OrdersTab sortBy={sortBy} />
    </section>
  );
}
