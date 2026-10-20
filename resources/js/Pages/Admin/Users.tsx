import React from "react";
import { Link } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import AdminTopNav from "@/Components/Admin/AdminTopNav";

type AdminUser = {
  id: number;
  name: string;
  username: string;
  email: string;
};

type UsersPageProps = {
  users: AdminUser[];
};

export default function UsersPage({ users = [] }: UsersPageProps) {
  const [query, setQuery] = React.useState("");

  const filteredUsers = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      [user.username, user.name, user.email].some((value) => String(value || "").toLowerCase().includes(q))
    );
  }, [query, users]);

  return (
    <AuthenticatedLayout>
      <AdminTopNav />
      <div className="min-h-screen bg-[#FAF8F2] px-6 py-10 text-[#2D2515] sm:px-10">
        <div className="mx-auto w-full max-w-4xl rounded-3xl border border-[#E5D4AF] bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="mt-1 text-sm text-[#6B5A34]">Click a username to open full user details.</p>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users..."
            className="mt-4 w-full rounded-xl border border-[#E5D4AF] bg-[#FFFCF4] px-4 py-2.5 text-sm focus:border-[#C6A75E] focus:outline-none"
          />

          <div className="mt-5 divide-y divide-[#EDE0BF] rounded-2xl border border-[#E5D4AF] bg-[#FFFEFA]">
            {filteredUsers.length === 0 ? (
              <p className="px-4 py-6 text-sm text-[#8A6D2B]">No users found.</p>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="grid grid-cols-1 gap-1 px-4 py-3 md:grid-cols-[1fr_1fr_1.2fr] md:items-center">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="text-sm font-semibold text-[#8A6D2B] underline-offset-4 hover:underline"
                  >
                    {user.username}
                  </Link>
                  <p className="text-sm text-[#5F4D27]">{user.name}</p>
                  <p className="truncate text-sm text-[#5F4D27]">{user.email}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
