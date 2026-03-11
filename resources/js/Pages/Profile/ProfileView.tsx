import React, { useEffect } from "react";
import NavMenu from "@/Components/Menu/NavMenu";
import { Folder, LogOut, Package, User } from "lucide-react";
import EditProfileModal from "./ProfileView/components/EditProfileModal";
import ProfileContent from "./ProfileView/components/ProfileContent";
import ProfileSidebar from "./ProfileView/components/ProfileSidebar";
import { ProfileViewProvider, useProfileViewContext } from "./ProfileView/ProfileViewContext";
import type { ActiveTab } from "./ProfileView/types";

function ProfileViewBody() {
  const { user, activeTab, setActiveTab, handleLogout } = useProfileViewContext();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    // Ensure stale modal/sidebar scroll locks never trap profile on mobile.
    document.body.style.overflow = "";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <h1 className="text-xl font-semibold text-gray-900">You are not logged in.</h1>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-gradient-to-b from-[#FFFDF8] via-[#FFFCF5] to-[#FDF6E7]">
      <NavMenu />

      <main className="mx-auto flex min-h-[calc(100dvh-4.5rem)] w-full max-w-7xl gap-4 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3 md:px-10 lg:min-h-0 lg:gap-6 lg:pb-16 lg:pt-8">
        <div className="hidden lg:block">
          <ProfileSidebar />
        </div>
        <section className="min-h-0 flex-1 overflow-visible">
          <ProfileContent />
        </section>
      </main>

      <MobileProfileBottomBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={handleLogout}
      />

      <EditProfileModal />
    </div>
  );
}

function MobileProfileBottomBar({
  activeTab,
  onSelectTab,
  onLogout,
}: {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onLogout: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[90] border-t border-gray-200 bg-white/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_26px_rgba(20,20,20,0.12)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-4 gap-2">
        <MobileTabButton
          label="Profile"
          active={activeTab === "profile"}
          onClick={() => onSelectTab("profile")}
          icon={<User className="h-4 w-4" />}
        />
        <MobileTabButton
          label="Designs"
          active={activeTab === "designs"}
          onClick={() => onSelectTab("designs")}
          icon={<Folder className="h-4 w-4" />}
        />
        <MobileTabButton
          label="Orders"
          active={activeTab === "orders"}
          onClick={() => onSelectTab("orders")}
          icon={<Package className="h-4 w-4" />}
        />
        <MobileTabButton
          label="Logout"
          active={false}
          onClick={onLogout}
          icon={<LogOut className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}

function MobileTabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition ${
        active
          ? "bg-[#C6A75E]/15 text-[#8A6D2B]"
          : "bg-white text-gray-700 hover:bg-[#C6A75E]/10"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export default function ProfileView() {
  return (
    <ProfileViewProvider>
      <ProfileViewBody />
    </ProfileViewProvider>
  );
}
