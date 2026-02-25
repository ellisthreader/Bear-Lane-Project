import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { BarChart3, ShoppingBag, Users, TrendingUp } from "lucide-react";

export default function Statistics() {
  const stats = [
    {
      title: "Total Revenue",
      value: "£12,450",
      icon: <TrendingUp className="w-8 h-8 text-green-600" />,
    },
    {
      title: "Total Orders",
      value: "342",
      icon: <ShoppingBag className="w-8 h-8 text-indigo-600" />,
    },
    {
      title: "Active Customers",
      value: "1,124",
      icon: <Users className="w-8 h-8 text-blue-600" />,
    },
    {
      title: "Conversion Rate",
      value: "3.4%",
      icon: <BarChart3 className="w-8 h-8 text-orange-600" />,
    },
  ];

  return (
    <AuthenticatedLayout>
      <div className="p-10 min-h-screen bg-gray-50 dark:bg-gray-900">

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Store Statistics
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((s, i) => (
            <div 
              key={i}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center gap-4">
                {s.icon}
                <div>
                  <p className="text-gray-500 dark:text-gray-300 text-sm">{s.title}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {s.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Placeholder for future charts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-md border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Revenue Overview
          </h2>

          <div className="w-full h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            Chart coming soon...
          </div>
        </div>

      </div>
    </AuthenticatedLayout>
  );
}
