import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Search, Users, UserPlus } from "lucide-react";

export default function UsersPage() {
  return (
    <AuthenticatedLayout>
      <div className="p-10 min-h-screen bg-gray-50 dark:bg-gray-900">

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          User Management
        </h1>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 max-w-4xl">

          <div className="flex items-center gap-4 mb-6">
            <Users className="w-10 h-10 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Customers & Admins
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                View and manage all registered users.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <Search className="w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search users..."
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none"
            />
          </div>

          <div className="w-full h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
            User table coming soon...
          </div>

        </div>

      </div>
    </AuthenticatedLayout>
  );
}
