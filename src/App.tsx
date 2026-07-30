import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Splash from "./pages/Splash";
import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";
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
import { LoanProvider } from "./context/LoanContext";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import Notifications from "./pages/Notifications";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <NotificationProvider>
            <LoanProvider>
            <Routes>
              <Route path="/" element={<Splash />} />
              <Route path="/login" element={<Login />} />
              <Route path="/create-account" element={<CreateAccount />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/borrow" element={<BorrowMoney />} />
              <Route path="/lend" element={<LendMoney />} />
              <Route path="/loans" element={<Dashboard />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/inbox/:id" element={<RequestDetail />} />
              <Route path="/loan-request/:id" element={<LoanRequestPage />} />
              <Route path="/overview" element={<Overview />} />
              <Route path="/loan-summary" element={<LoanSummary />} />
              <Route path="/loan-details" element={<LoanDetails />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/edit-personal-info" element={<EditPersonalInfo />} />
              <Route path="/manage-members" element={<ManageMembers />} />
              <Route path="/add-member" element={<AddMember />} />
              <Route path="/login-security" element={<LoginSecurity />} />
              <Route path="/alerts-setting" element={<AlertsSetting />} />
              <Route path="/upcoming-payments" element={<UpcomingPayments />} />
              <Route path="/all-transactions" element={<AllTransactions />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </LoanProvider>
          </NotificationProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
export default App;
