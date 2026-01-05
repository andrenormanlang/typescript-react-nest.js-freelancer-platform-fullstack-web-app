import { Link, useNavigate } from "react-router-dom";
import React, { useState, useContext, useEffect, Suspense } from "react";
import { logout } from "../services/MindsMeshAPI";
import { Button } from "./shadcn/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./shadcn/ui/dialog";
import {
  PersonIcon,
  ExitIcon,
  LockClosedIcon,
  Pencil1Icon,
} from "@radix-ui/react-icons";
import { FaPalette } from "react-icons/fa";
import logo from "../assets/logo.svg";
import { UserContext } from "../contexts/UserContext";
import { useGradient } from "../hooks/useGradient";
import { useToast } from "./shadcn/ui/use-toast";
import LoadingSpinner from "../helpers/LoadingSpinner";

const LoginForm = React.lazy(() => import("./LoginForm"));
const RegisterForm = React.lazy(() => import("./RegisterForm"));
const EditProfileForm = React.lazy(() => import("./EditProfileForm"));

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const userContext = useContext(UserContext);
  const { toggleGradient } = useGradient();
  const { toast } = useToast();

  if (!userContext) {
    throw new Error("UserContext must be used within a UserProvider");
  }

  const { user, setUser, refreshUser } = userContext;

  const [menuOpen, setMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null); // Update UserContext state
      toast({
        title: "Logged Out",
        description: "You've safely signed out. Come back soon!",
        variant: "success",
        duration: 5000,
      });

      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);

      toast({
        title: "Logout Failed",
        description: "There was an error while logging out. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [menuOpen]);

  return (
    <nav
      className={`navbar p-2 h-16 top-0 z-50 transition-colors duration-500`}
    >
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo and Brand Name */}
        <Link
          to="/"
          className="navbarTitle text-white text-xl font-bold flex items-center"
        >
          {logo && <img src={logo} alt="MindsMesh" className="h-10 mr-2" />}
          <span className="hidden sm:inline"></span>
        </Link>

        {/* Menu Items and Theme Toggle */}
        <div className="flex items-center space-x-4">
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center space-x-2">
                  <img
                    src={
                      user.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        user.username
                      )}&background=random`
                    }
                    alt={`${user.username}'s avatar`}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                </div>
                {/* Show Profile button for all users */}
                <Button
                  variant="ghost"
                  className="text-white flex items-center"
                  onClick={() => setIsProfileOpen(true)}
                >
                  <PersonIcon className="h-5 w-5 mr-1" />
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  className="text-white flex items-center"
                  onClick={handleLogout}
                >
                  <ExitIcon className="h-5 w-5 mr-1" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                {/* Login Dialog */}
                <Dialog
                  open={isLoginDialogOpen}
                  onOpenChange={setIsLoginDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="text-white flex items-center"
                    >
                      <LockClosedIcon className="h-5 w-5 mr-1" /> Login
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Login</DialogTitle>
                    </DialogHeader>
                    <Suspense fallback={<LoadingSpinner />}>
                      <LoginForm />
                    </Suspense>
                  </DialogContent>
                </Dialog>

                {/* Register Dialog */}
                <Dialog
                  open={isRegisterDialogOpen}
                  onOpenChange={setIsRegisterDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="text-white flex items-center"
                    >
                      <Pencil1Icon className="h-5 w-5 mr-1" /> Register
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Register</DialogTitle>
                    </DialogHeader>
                    <Suspense fallback={<LoadingSpinner />}>
                      <RegisterForm
                        onClose={() => setIsRegisterDialogOpen(false)}
                      />
                    </Suspense>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>

          {/* Gradient Toggle Button */}
          <button
            onClick={toggleGradient}
            className="bg-blue-500 text-white px-4 py-2 rounded transition-all duration-300 hover:bg-blue-600"
          >
            <FaPalette />
          </button>

          {/* Mobile Menu Toggle */}
          <div
            className="hamburgerIcon md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div className={`bar bar1 ${menuOpen ? "rotate45" : ""}`}></div>
            <div className={`bar bar2 ${menuOpen ? "opacity-0" : ""}`}></div>
            <div className={`bar bar3 ${menuOpen ? "rotate-45" : ""}`}></div>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Only display on mobile */}
      <div className={`mobileMenu md:hidden ${menuOpen ? "active" : ""}`}>
        {user ? (
          <>
            {/* User Avatar - Displayed at the top of the mobile menu */}
            <div className="flex items-center justify-center my-4">
              <img
                src={
                  user.avatarUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user.username
                  )}&background=random`
                }
                alt={`${user.username}'s avatar`}
                className="w-16 h-16 rounded-full object-cover"
              />
            </div>
            {/* Profile Button for All Users */}
            <Button
              variant="ghost"
              className="text-white w-full flex items-center justify-center hover:bg-gray-700 rounded-md py-3 transition-colors duration-200"
              onClick={() => {
                setMenuOpen(false);
                setIsProfileOpen(true);
              }}
            >
              <PersonIcon className="h-5 w-5 mr-2" />
              Profile
            </Button>
            <Button
              variant="ghost"
              className="text-white w-full flex items-center justify-center hover:bg-gray-700 rounded-md py-3 transition-colors duration-200"
              onClick={() => {
                handleLogout();
                setMenuOpen(false);
              }}
            >
              <ExitIcon className="h-5 w-5 mr-2" />
              Logout
            </Button>
          </>
        ) : (
          <>
            {/* Mobile Login Dialog */}
            <Dialog
              open={isLoginDialogOpen}
              onOpenChange={(isOpen) => {
                setIsLoginDialogOpen(isOpen);
                if (isOpen) setMenuOpen(false);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-white w-full flex items-center justify-center hover:bg-gray-700 rounded-md py-3 transition-colors duration-200"
                >
                  <LockClosedIcon className="h-5 w-5 mr-2" />
                  Login
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Login</DialogTitle>
                </DialogHeader>
                <Suspense fallback={<LoadingSpinner />}>
                  <LoginForm />
                </Suspense>
              </DialogContent>
            </Dialog>

            {/* Mobile Register Dialog */}
            <Dialog
              open={isRegisterDialogOpen}
              onOpenChange={(isOpen) => {
                setIsRegisterDialogOpen(isOpen);
                if (isOpen) setMenuOpen(false);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-white w-full flex items-center justify-center hover:bg-gray-700 rounded-md py-3 transition-colors duration-200"
                >
                  <Pencil1Icon className="h-5 w-5 mr-2" />
                  Register
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Register</DialogTitle>
                </DialogHeader>
                <Suspense fallback={<LoadingSpinner />}>
                  <RegisterForm
                    onClose={() => setIsRegisterDialogOpen(false)}
                  />
                </Suspense>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* Profile Edit Modal */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<LoadingSpinner />}>
            {user && (
              <EditProfileForm
                user={user}
                setUser={(updatedUser) => {
                  setUser(updatedUser);
                  setIsProfileOpen(false);
                  refreshUser();
                }}
              />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>
    </nav>
  );
};

export default Navbar;
