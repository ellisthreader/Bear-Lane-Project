import React from "react";
import NavMenu from "@/Components/Menu/NavMenu";
import EditProfileModal from "./ProfileView/components/EditProfileModal";
import ProfileContent from "./ProfileView/components/ProfileContent";
import ProfileSidebar from "./ProfileView/components/ProfileSidebar";
import { ProfileViewProvider, useProfileViewContext } from "./ProfileView/ProfileViewContext";

function ProfileViewBody() {
  const { user } = useProfileViewContext();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <h1 className="text-xl font-semibold text-gray-900">You are not logged in.</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFDF8] via-[#FFFCF5] to-[#FDF6E7]">
      <NavMenu />

      <main className="mx-auto flex w-full max-w-7xl gap-6 px-4 pb-16 pt-8 md:px-10">
        <ProfileSidebar />
        <section className="flex-1">
          <ProfileContent />
        </section>
      </main>

      <EditProfileModal />
    </div>
  );
}

export default function ProfileView() {
  return (
    <ProfileViewProvider>
      <ProfileViewBody />
    </ProfileViewProvider>
  );
}
