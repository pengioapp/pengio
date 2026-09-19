import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import HomePage from "./pages/HomePage";
import BorrowMoney from "./pages/BorrowMoney";
import LendMoney from "./pages/LendMoney";
import Inbox from "./pages/Inbox";
import RequestDetail from "./pages/RequestDetail";
import LoanRequestPage from "./pages/LoanRequest";
import Overview from "./pages/Overview";
import LoanSummary from "./pages/LoanSummary";
import LoanDetails from "./pages/LoanDetails";
import Profile from "./pages/Profile";
import EditPersonalInfo from "./pages/EditPersonalInfo";
import ManageMembers from "./pages/ManageMembers";
import AddMember from "./pages/AddMember";
import LoginSecurity from "./pages/LoginSecurity";
import AlertsSetting from "./pages/AlertsSetting";
import UpcomingPayments from "./pages/UpcomingPayments";
import AllTransactions from "./pages/AllTransactions";
import NotFound from "./pages/NotFound";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import Notifications from "./pages/Notifications";
import RequireAuth from "./components/RequireAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* Vite sets BASE_URL from the build's base path, so the router stays
          correct whether the app is served from the domain root or from
          /pengio/ on GitHub Pages. */}
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
            <Routes>
              <Route path="/" element={<Splash />} />
              <Route path="/login" element={<Login />} />
              <Route path="/create-account" element={<CreateAccount />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/home" element={<RequireAuth><HomePage /></RequireAuth>} />
              <Route path="/borrow" element={<RequireAuth><BorrowMoney /></RequireAuth>} />
              <Route path="/lend" element={<RequireAuth><LendMoney /></RequireAuth>} />
              <Route path="/loans" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/inbox" element={<RequireAuth><Inbox /></RequireAuth>} />
              <Route path="/inbox/:id" element={<RequireAuth><RequestDetail /></RequireAuth>} />
              <Route path="/loan-request/:id" element={<RequireAuth><LoanRequestPage /></RequireAuth>} />
              <Route path="/overview" element={<RequireAuth><Overview /></RequireAuth>} />
              <Route path="/loan-summary" element={<RequireAuth><LoanSummary /></RequireAuth>} />
              <Route path="/loan-details" element={<RequireAuth><LoanDetails /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/edit-personal-info" element={<RequireAuth><EditPersonalInfo /></RequireAuth>} />
              <Route path="/manage-members" element={<RequireAuth><ManageMembers /></RequireAuth>} />
              <Route path="/add-member" element={<RequireAuth><AddMember /></RequireAuth>} />
              <Route path="/login-security" element={<RequireAuth><LoginSecurity /></RequireAuth>} />
              <Route path="/alerts-setting" element={<RequireAuth><AlertsSetting /></RequireAuth>} />
              <Route path="/upcoming-payments" element={<RequireAuth><UpcomingPayments /></RequireAuth>} />
              <Route path="/all-transactions" element={<RequireAuth><AllTransactions /></RequireAuth>} />
              <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
export default App;
