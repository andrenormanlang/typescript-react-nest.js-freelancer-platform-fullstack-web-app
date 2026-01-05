import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Navbar from "./components/NavBar";
import Footer from "./components/Footer";
import React, { Suspense } from "react";
import LoadingSpinner from "./helpers/LoadingSpinner";
import { UserProvider } from "./contexts/UserContext";
import { GradientProvider } from "./contexts/GradientContext";
import "./App.css";
import { Toaster } from "./components/shadcn/ui/toaster";
import { SocketProvider } from "./contexts/SocketContext";
import { Provider as JotaiProvider } from "jotai";

const HomePage = React.lazy(() => import("./pages/HomePage")); // Lazy load the HomePage
const EmailVerificationPage = React.lazy(
  () => import("./pages/EmailVerificationPage")
);
const ResetPasswordPage = React.lazy(() => import("./pages/ResetPasswordPage"));

function App() {
  return (
    <>
      <Toaster />
      <JotaiProvider>
        <Router>
          <UserProvider>
            <GradientProvider>
              <SocketProvider>
                <Navbar />
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route
                      path="/verify-email"
                      element={<EmailVerificationPage />}
                    />
                    <Route
                      path="/reset-password"
                      element={<ResetPasswordPage />}
                    />
                  </Routes>
                </Suspense>
                <Footer />
              </SocketProvider>
            </GradientProvider>
          </UserProvider>
        </Router>
      </JotaiProvider>
    </>
  );
}

export default App;
