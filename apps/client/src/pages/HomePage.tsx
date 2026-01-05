import React, {
  useEffect,
  useState,
  useCallback,
  useContext,
  Suspense,
} from "react";
import { useNavigate } from "react-router-dom";
import { GradientContext } from "../contexts/GradientContext";
import { UserContext } from "../contexts/UserContext";
import { SocketContext } from "../contexts/SocketContext";
import { useAtom } from "jotai"; // Import from Jotai
import { unreadCountsAtom } from "../atoms/unreadCountsAtom"; // Our global atom

import HipsterChubbyCat from "../assets/Hipster-Chubby-Cat.webp";
import HipsterChubbyCat2 from "../assets/Hipster-Chubby-Cat-2.webp";
import { Input } from "../components/shadcn/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/shadcn/ui/dialog";
import {
  deleteUser,
  fetchUsersWithSkills,
  getUnreadCounts,
} from "../services/MindsMeshAPI";
import { User } from "../types/types";
import UserCard from "../components/UserCard";
import useDebounce from "../hooks/useDebounce";
import LoadingSpinner from "../helpers/LoadingSpinner";

const EditProfileForm = React.lazy(
  () => import("../components/EditProfileForm")
);
const DeleteAccountModal = React.lazy(
  () => import("../components/DeleteAccountConfirm")
);
const UserDetailCard = React.lazy(() => import("../components/UserDetail"));
const Chat = React.lazy(() => import("../components/Chat"));
const Rooms = React.lazy(() => import("../components/Rooms"));

const HomePage = () => {
  const [usersWithSkills, setUsersWithSkills] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResultPhrase, setSearchResultPhrase] = useState<string | null>(
    null
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRoomsModalOpen, setIsRoomsModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Use the atom for unreadCounts
  const [unreadCounts, setUnreadCounts] = useAtom(unreadCountsAtom);

  const [onlineFreelancers, setOnlineFreelancers] = useState<Set<string>>(
    new Set()
  );

  const navigate = useNavigate();
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const userContext = useContext(UserContext);
  const gradientContext = useContext(GradientContext);
  const { socket } = useContext(SocketContext);

  if (!userContext || !gradientContext) {
    throw new Error(
      "UserContext and GradientContext must be used within their respective providers"
    );
  }

  const { refreshUser, setUser } = userContext;
  const memoizedRefreshUser = useCallback(refreshUser, []);

  // Fetch Users and Profiles
  useEffect(() => {
    const loadUsersAndProfile = async () => {
      setIsLoading(true);
      setSearchResultPhrase(null);
      try {
        await memoizedRefreshUser();

        let users: User[] = [];
        if (userContext?.user?.role === "employer") {
          users = await fetchUsersWithSkills(
            debouncedSearchQuery.toLowerCase(),
            "freelancer"
          );
        } else if (userContext?.user?.role === "freelancer") {
          users = [userContext.user];
        } else {
          users = await fetchUsersWithSkills(
            debouncedSearchQuery.toLowerCase(),
            "freelancer"
          );
        }

        setUsersWithSkills(users);
        setSearchResultPhrase(`You found ${users.length} user(s).`);
      } catch (error) {
        console.error("Failed to fetch users or profile", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUsersAndProfile();
  }, [debouncedSearchQuery, memoizedRefreshUser, userContext?.user?.role]);

  // Fetch unread counts once on mount
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const counts = await getUnreadCounts();
        console.log("Fetched unread counts:", counts);
        setUnreadCounts(counts); // Store in Jotai atom
      } catch (error) {
        console.error("Failed to fetch unread counts", error);
      }
    };

    fetchUnread();
  }, [setUnreadCounts]);

  // Set up global socket listeners for message events, so that unread counts update in real-time
  useEffect(() => {
    if (socket && userContext.user) {
      // When a message is received and the current user is a freelancer
      const handleReceiveMessage = (message: any) => {
        if (message.receiverId === userContext.user?.id) {
          // Increase the unread count globally
          setUnreadCounts((prev) => ({
            ...prev,
            [message.senderId]: (prev[message.senderId] || 0) + 1,
          }));
        }
      };

      // When messages are read
      const handleMessagesRead = (data: {
        senderId: string;
        receiverId: string;
      }) => {
        if (data.receiverId === userContext.user?.id) {
          // Reset unread count for that sender
          setUnreadCounts((prev) => ({
            ...prev,
            [data.senderId]: 0,
          }));
        }
      };

      socket.on("receiveMessage", handleReceiveMessage);
      socket.on("messagesRead", handleMessagesRead);

      return () => {
        socket.off("receiveMessage", handleReceiveMessage);
        socket.off("messagesRead", handleMessagesRead);
      };
    }
  }, [socket, userContext.user, setUnreadCounts]);

  // Handle Online/Offline for freelancers if user is employer
  useEffect(() => {
    if (socket && userContext.user?.role === "employer") {
      const handleConnect = () => {
        socket.emit("requestOnlineUsers");
      };

      const handleUserOnline = (data: { userId: string }) => {
        setOnlineFreelancers((prev) => new Set([...prev, data.userId]));
      };

      const handleUserOffline = (data: { userId: string }) => {
        setOnlineFreelancers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      };

      const handleOnlineUsers = (data: { userIds: string[] }) => {
        setOnlineFreelancers(new Set(data.userIds));
      };

      socket.on("onlineUsers", handleOnlineUsers);
      socket.on("connect", handleConnect);
      socket.on("userOnline", handleUserOnline);
      socket.on("userOffline", handleUserOffline);

      return () => {
        socket.off("onlineUsers", handleOnlineUsers);
        socket.off("connect", handleConnect);
        socket.off("userOnline", handleUserOnline);
        socket.off("userOffline", handleUserOffline);
      };
    }
  }, [socket, userContext.user?.role]);

  const handleDeleteAccount = useCallback(
    async (userId: string) => {
      await deleteUser(userId);
      setSelectedUser(null);
      navigate("/");
    },
    [navigate]
  );

  // Close all modals
  const closeAllModals = () => {
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsViewModalOpen(false);
    setIsChatModalOpen(false);
    setIsRoomsModalOpen(false);
  };

  const openEditModal = useCallback((user: User) => {
    closeAllModals();
    setSelectedUser(user);
    setIsEditModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((user: User) => {
    closeAllModals();
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  }, []);

  const openViewModal = useCallback((user: User, event: React.MouseEvent) => {
    event.stopPropagation();
    closeAllModals();
    setSelectedUser(user);
    setIsViewModalOpen(true);
  }, []);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(event.target.value);
    },
    []
  );

  const openChatOrRoomsModal = useCallback(
    (user: User, event: React.MouseEvent) => {
      event.stopPropagation();
      closeAllModals();

      if (
        userContext?.user?.role === "freelancer" &&
        userContext.user.id === user.id
      ) {
        // Freelancer sees their rooms
        setSelectedUser(user);
        setIsRoomsModalOpen(true);
      } else {
        // Employer chats with freelancer
        setSelectedUser(user);
        setIsChatModalOpen(true);
      }
    },
    [userContext?.user]
  );

  return (
    <div className="min-h-screen text-white relative">
      <img
        src={HipsterChubbyCat}
        alt="Hipster Chubby Cat"
        loading="lazy"
        decoding="async"
        className="ml-4 absolute top-0 left-0 transform -rotate-180 w-20 h-20 sm:w-32 sm:h-32 lg:w-48 lg:h-48 hover-slide-fade-left"
      />
      <img
        src={HipsterChubbyCat2}
        alt="Hipster Chubby Cat 2"
        loading="lazy"
        decoding="async"
        className="mr-4 absolute bottom-0 right-0 w-28 h-28 sm:w-48 sm:h-48 lg:w-64 lg:h-64 hover-slide-fade-right"
      />

      <div className="flex flex-col items-center py-16 sm:py-24 relative z-10 w-full">
        <h1
          className="text-lg sm:text-xl lg:text-4xl font-bold mb-6 sm:mb-4 text-right sm:text-center lg:text-center text-white transition-colors duration-500"
          style={{ textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)" }}
        >
          Find the right pro, right away
        </h1>
        <Input
          type="text"
          placeholder="Search for any service..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-11/12 sm:w-1/2 p-4 text-lg rounded-full mb-2 border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 shadow-lg placeholder-gray-400"
        />
      </div>

      {debouncedSearchQuery && searchResultPhrase && (
        <div className="flex justify-center items-center py-4">
          <p className="text-lg text-white">{searchResultPhrase}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4 sm:p-8">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          usersWithSkills
            .filter((user) => user.role !== "employer")
            .map((user) => (
              <UserCard
                key={user.id}
                user={user}
                isOnline={onlineFreelancers.has(user.id)}
                unreadCount={unreadCounts[user.id] || 0}
                unreadCounts={unreadCounts}
                onViewDetails={openViewModal}
                onEdit={
                  userContext?.user?.id === user.id ? openEditModal : undefined
                }
                onDelete={
                  userContext?.user?.id === user.id
                    ? openDeleteModal
                    : undefined
                }
                onChat={openChatOrRoomsModal}
              />
            ))
        )}
      </div>

      {/* Edit Profile Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<LoadingSpinner />}>
            {selectedUser && (
              <EditProfileForm user={selectedUser} setUser={setUser} />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Delete Account Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <Suspense fallback={<LoadingSpinner />}>
          {selectedUser && (
            <DeleteAccountModal
              userEmail={selectedUser.email}
              onDeleteConfirm={() => handleDeleteAccount(selectedUser.id)}
              isOpen={isDeleteModalOpen}
              onClose={() => setIsDeleteModalOpen(false)}
            />
          )}
        </Suspense>
      </Dialog>

      {/* View Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="w-full sm:max-w-[700px] p-4 m-0">
          <Suspense fallback={<LoadingSpinner />}>
            {selectedUser && <UserDetailCard user={selectedUser} />}
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Chat Modal */}
      <Dialog open={isChatModalOpen} onOpenChange={setIsChatModalOpen}>
        <DialogContent className="w-full sm:max-w-[400px] p-0 m-0">
          <Suspense fallback={<LoadingSpinner />}>
            {isChatModalOpen && selectedUser && (
              <Chat
                chatPartner={selectedUser}
                onClose={() => setIsChatModalOpen(false)}
              />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>

      {/* Rooms Modal (Freelancer's Rooms) */}
      <Dialog open={isRoomsModalOpen} onOpenChange={setIsRoomsModalOpen}>
        <DialogContent className="w-full sm:max-w-[500px] p-4">
          <Suspense fallback={<LoadingSpinner />}>
            {userContext.user && (
              <Rooms
                isOpen={isRoomsModalOpen}
                freelancerId={userContext.user.id}
                onClose={() => setIsRoomsModalOpen(false)}
              />
            )}
          </Suspense>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomePage;
