/**
 * RootLayout
 * Top-most layout inside the Router tree.
 * DataProvider lives here — inside RouterProvider — so every route component
 * is guaranteed to have the DataContext available (React Router v7 data mode
 * renders its own subtree and may not inherit contexts from outside RouterProvider).
 */
import { Outlet } from "react-router";
import { DataProvider } from "../../context/DataContext";
import { DemoModeBanner } from "./DemoModeBanner";

export default function RootLayout() {
  return (
    <DataProvider>
      <Outlet />
      <DemoModeBanner />
    </DataProvider>
  );
}
