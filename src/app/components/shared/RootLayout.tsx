/**
 * RootLayout
 * Top-most layout inside the Router tree.
 * Renders all child routes via <Outlet> and overlays the DemoModeBanner.
 * Must stay inside RouterProvider so useNavigate() works correctly.
 */
import { Outlet } from "react-router";
import { DemoModeBanner } from "./DemoModeBanner";

export default function RootLayout() {
  return (
    <>
      <Outlet />
      <DemoModeBanner />
    </>
  );
}
