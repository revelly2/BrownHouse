import React from "react";
import { Redirect } from "expo-router";

export default function CashierDashboardRedirect() {
  return <Redirect href="/admin/memberships" />;
}
