import React from "react";
import { useProfileViewContext } from "../ProfileViewContext";
import DesignsTab from "./DesignsTab";
import OrdersHistoryTab from "./OrdersHistoryTab";
import ProfileHomeTab from "./ProfileHomeTab";

export default function ProfileContent() {
  const { activeTab } = useProfileViewContext();

  if (activeTab === "designs") return <DesignsTab />;
  if (activeTab === "orders") return <OrdersHistoryTab />;
  return <ProfileHomeTab />;
}
