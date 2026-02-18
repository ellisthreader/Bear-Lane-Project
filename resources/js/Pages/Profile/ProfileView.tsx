import React from "react";
import { usePage, router } from "@inertiajs/react";
import OrdersTab from "./OrdersTab";
import NavMenu from "@/Components/Menu/NavMenu";

export default function Profile() {
  const { auth } = usePage().props as any;
  const user = auth.user;
  const gold = "#C6A75E";

  // Placeholder arrays (replace with real data later)
  const designs: any[] = [];
  const wishlist: any[] = [];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <h1 className="text-xl font-semibold">You are not logged in.</h1>
      </div>
    );
  }

  const handleLogout = () => router.post("/logout");
  const handleEditProfile = () => router.get("/profile/edit");

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <NavMenu />

      <main className="px-6 md:px-12 pt-10 pb-20 flex-1">
        <div className="max-w-7xl mx-auto space-y-12">

          {/* Welcome */}
          <div className="animate-fadeIn">
            <h1 className="text-4xl font-bold text-gray-900">
              Welcome Back, {user.username}
            </h1>
          </div>

          {/* PROFILE + ADDRESS/PAYMENT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">

            {/* PROFILE */}
            <div className="bg-gray-100 rounded-2xl p-10 shadow-sm hover:shadow-md transition animate-fadeIn flex flex-col justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-8">
                  Profile
                </h2>

                <div className="space-y-6 text-lg">
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Name</p>
                    <p className="font-medium text-gray-900">{user.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Username</p>
                    <p className="font-medium text-gray-900">{user.username}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Email</p>
                    <p className="font-medium text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm mb-1">Password</p>
                    <p className="font-medium text-gray-900">••••••••</p>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex gap-6">
                <button
                  onClick={handleLogout}
                  className="px-8 py-4 text-white text-lg font-semibold rounded-2xl shadow-md hover:shadow-lg transition-all duration-300"
                  style={{ background: gold }}
                >
                  Log Out
                </button>

                <button
                  onClick={handleEditProfile}
                  className="px-8 py-4 text-lg font-semibold rounded-2xl border border-gray-300 hover:border-black hover:text-black transition-all duration-300"
                >
                  Edit Profile
                </button>
              </div>
            </div>

            {/* ADDRESS + PAYMENT */}
            <div className="flex flex-col gap-10 h-full">
              <div className="bg-gray-100 rounded-2xl p-10 shadow-sm hover:shadow-md transition animate-fadeIn flex-1">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Address Book
                  </h2>
                  <button
                    className="text-base font-medium underline hover:text-black transition-colors"
                    style={{ color: gold }}
                  >
                    Add New
                  </button>
                </div>
                <p className="text-gray-500">No saved addresses yet.</p>
              </div>

              <div className="bg-gray-100 rounded-2xl p-10 shadow-sm hover:shadow-md transition animate-fadeIn flex-1">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Payment Methods
                  </h2>
                  <button
                    className="text-base font-medium underline hover:text-black transition-colors"
                    style={{ color: gold }}
                  >
                    Add New
                  </button>
                </div>
                <p className="text-gray-500">
                  No saved payment methods yet.
                </p>
              </div>
            </div>
          </div>

          {/* ORDER HISTORY */}
          <div className="bg-gray-100 rounded-2xl p-12 shadow-sm hover:shadow-md transition animate-fadeIn">
            <h2 className="text-2xl font-semibold text-gray-900 mb-8">
              Order History
            </h2>
            <OrdersTab auth={auth} />
          </div>

          {/* MY DESIGNS */}
          <div className="bg-gray-100 rounded-2xl p-12 shadow-sm hover:shadow-md transition animate-fadeIn">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900">
                My Designs
              </h2>
              <button
                onClick={() => router.get("/designer")}
                className="text-base font-medium underline hover:text-black transition-colors"
                style={{ color: gold }}
              >
                Create New
              </button>
            </div>

            {designs.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                You haven’t created any designs yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {designs.map((design, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
                  >
                    <img
                      src={design.image}
                      alt="Design"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* WISHLIST */}
          <div className="bg-gray-100 rounded-2xl p-12 shadow-sm hover:shadow-md transition animate-fadeIn">
            <h2 className="text-2xl font-semibold text-gray-900 mb-8">
              Wishlist
            </h2>

            {wishlist.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                Your wishlist is empty.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {wishlist.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
                  >
                    <img
                      src={item.image}
                      alt="Wishlist Item"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
