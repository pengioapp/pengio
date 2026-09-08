import type { ReactNode } from "react";
import BottomNav from "@/components/BottomNav";

/**
 * Chrome that every signed-in screen shares.
 *
 * The navigation bar used to be imported page by page, and only six of the
 * nineteen screens remembered to do it. Testers reported the bar "disappearing"
 * and no way back to the home screen -- that was not a bug in the bar, it was
 * thirteen screens that never rendered it. Owning it here means a new page
 * cannot forget.
 *
 * Pages keep their own bottom padding so their content clears the bar, which is
 * fixed and therefore takes up no layout space of its own.
 */
const AppLayout = ({ children }: { children: ReactNode }) => (
  <>
    {children}
    <BottomNav />
  </>
);

export default AppLayout;
