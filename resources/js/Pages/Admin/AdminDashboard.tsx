import React from "react";
import { Link } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { BarChart3, MessageSquare, Package, Users } from "lucide-react";

export default function AdminDashboard({ auth }: any) {
  const user = auth?.user;

  const cards = [
    {
      title: "Statistics",
      icon: <BarChart3 className="w-10 h-10 text-indigo-600" />,
      link: "/admin/statistics",
      description: "View store performance & analytics",
    },
    {
      title: "Support & Live Chat",
      icon: <MessageSquare className="w-10 h-10 text-green-600" />,
      link: "/admin/livechats",
      description: "Manage customer live chat in real-time",
    },
    {
      title: "Products",
      icon: <Package className="w-10 h-10 text-orange-600" />,
      link: "/admin/products",
      description: "Manage products, inventory & variants",
    },
    {
      title: "Users",
      icon: <Users className="w-10 h-10 text-blue-600" />,
      link: "/admin/users",
      description: "View & manage customers and admins",
    },
  ];

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">

        {/* BEAUTIFUL WELCOME MESSAGE */}
        <div className="text-center mb-12 animate-fadeSlideIn">
          <h1 className="
            text-5xl 
            font-extrabold 
            bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 
            bg-clip-text text-transparent 
            drop-shadow-lg
          ">
            Welcome back, {user?.name}! 
          </h1>

          <p className="text-gray-600 dark:text-gray-300 mt-3 text-lg tracking-wide">
            We're glad to see you again — let's manage your store.
          </p>
        </div>

        {/* BOX GRID */}
        <div
          className="
            grid 
            grid-cols-1 
            sm:grid-cols-2 
            lg:grid-cols-4 
            gap-6 
            max-w-6xl 
            w-full
            animate-fadeIn
          "
        >
          {cards.map((card, index) => (
            <Link
              key={index}
              href={card.link}
              className="
                bg-white dark:bg-gray-800 
                p-6 rounded-2xl shadow-md 
                hover:shadow-2xl border border-gray-100 dark:border-gray-700 
                text-center transition-all hover:scale-105 hover:-translate-y-1
              "
            >
              <div className="flex flex-col items-center gap-4">
                {card.icon}

                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {card.title}
                </h2>

                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {card.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
