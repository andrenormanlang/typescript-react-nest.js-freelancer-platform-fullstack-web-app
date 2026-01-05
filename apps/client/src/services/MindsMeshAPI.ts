import axios, { AxiosError } from "axios";
import { User, Skill, UserAuth, Room } from "../types/types";

const api = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Adding JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.log("No token found in localStorage.");
  }
  return config;
});

// Registration and Email existence Verification
export const register = async (
  username: string,
  role: "freelancer" | "employer",
  password: string,
  email: string,
  avatarFile: File | null,
  skillImageUrls: File[] | null
): Promise<User> => {
  const formData = new FormData();

  formData.append("username", username);
  formData.append("role", role);
  formData.append("password", password);
  formData.append("email", email);

  if (avatarFile) {
    formData.append("avatar", avatarFile);
  }

  if (skillImageUrls) {
    skillImageUrls.forEach((file) => {
      formData.append("skillImageUrls", file);
    });
  }

  try {
    const response = await api.post("/users/register", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    // localStorage.setItem("token", response.data.access_token);
    return response.data;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
};

export const verifyEmail = async (userId: string): Promise<void> => {
  try {
    const response = await api.get(`/users/verify-email`, {
      params: { userId },
    });
    console.log(response.data.message);
  } catch (error) {
    console.error("Error verifying email:", error);
    throw error;
  }
};

export const resendVerificationEmail = async (email: string): Promise<void> => {
  try {
    await api.post("/users/resend-verification-email", { email });
  } catch (error) {
    console.error("Error resending verification email:", error);
    throw error;
  }
};

// Login and logout
export const login = async (email: string, password: string): Promise<User> => {
  const response = await api.post("/auth/login", { email, password });
  localStorage.setItem("token", response.data.access_token);
  localStorage.setItem("userId", response.data.userId);
  return await getProfile();
};

export const logout = async (): Promise<void> => {
  const userId = localStorage.getItem("userId");

  if (userId) {
    await api.post(`/auth/logout`);
  }

  localStorage.removeItem("token");
  localStorage.removeItem("userId");
};

// Password Management
export const requestPasswordReset = async (email: string): Promise<void> => {
  await api.post("/auth/forgot-password", { email });
};

export const sendPasswordResetEmail = async (email: string): Promise<void> => {
  await api.post("/auth/forgot-password", { email });
};

export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<void> => {
  await api.post(`/auth/reset-password`, { token, newPassword });
};

export const updatePassword = async (
  userId: string,
  newPassword: string,
  currentPassword: string
) => {
  const response = await fetch(`/api/users/${userId}/update-password`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ newPassword, currentPassword }),
  });
  if (!response.ok) {
    throw new Error("Failed to update password");
  }
  return response.json();
};

// User Management
export const getAllUsers = async (): Promise<User[]> => {
  const response = await api.get("/users");
  return response.data;
};

export const getUserById = async (userId: string): Promise<User> => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    throw error;
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  await api.delete(`/users/${userId}`);
};

export const updateUser = async (data: {
  id: string;
  username?: string;
  password?: string;
  skillImageUrls?: string[];
  avatarFile?: File;
  newSkillImages?: File[];
}): Promise<User> => {
  const formData = new FormData();

  if (data.username) formData.append("username", data.username);

  if (data.skillImageUrls) {
    data.skillImageUrls.forEach((url) => {
      formData.append("skillImageUrls[]", url);
    });
  }

  if (data.avatarFile) {
    formData.append("avatar", data.avatarFile);
  }

  if (data.newSkillImages && data.newSkillImages.length > 0) {
    data.newSkillImages.forEach((file) => {
      formData.append("skillFiles", file); // Key matches backend expectation
    });
  }

  const response = await api.put(`/users/${data.id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Admin Management
export const manageUserRoles = async (
  userId: string,
  role: string
): Promise<void> => {
  await api.put(`/admin/users/${userId}/role`, { role });
};

// Profile Management
export const getProfile = async (): Promise<User> => {
  try {
    const response = await api.get("/auth/profile");
    const profile: UserAuth = response.data;
    return await getUserById(profile.sub);
  } catch (error) {
    console.error("Error fetching profile:", error);
    throw error;
  }
};

export const updateProfile = async (
  profileData: Partial<User>
): Promise<User> => {
  const response = await api.put(`/users/${profileData.id}`, profileData);
  return response.data;
};

// Displaying Users and Skills
export const fetchUsersWithSkills = async (
  query: string = "",
  role?: string
): Promise<User[]> => {
  try {
    const endpoint = query.trim() ? "/skills/search" : "/users";
    const params: any = query.trim() ? { q: query, t: Date.now() } : {};
    if (role) {
      params.role = role;
    }
    const response = await api.get(endpoint, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching users with skills:", error);
    throw error;
  }
};

export const getAllSkillTitles = async (): Promise<{ title: string }[]> => {
  try {
    const response = await api.get("/skills/all");
    return response.data;
  } catch (error) {
    console.error("Error fetching all skills:", error);
    throw error;
  }
};

export const searchUsersBySkill = async (query: string): Promise<User[]> => {
  try {
    const response = await api.get(`/skills/search`, { params: { q: query } });
    return response.data;
  } catch (error) {
    console.error("Error fetching users by skill:", error);
    throw error;
  }
};

export const getProfileWithFullUserData = async (): Promise<User> => {
  const profileResponse = await api.get("/auth/profile");
  const profile: UserAuth = profileResponse.data;
  const fullUserResponse = await api.get(`/users/${profile.sub}`);
  return fullUserResponse.data;
};

// Skill Management
export const addSkillToUser = async (
  userId: string,
  skillData: Partial<Skill>
): Promise<Skill> => {
  try {
    const response = await api.post(`/users/${userId}/skills`, skillData);
    return response.data;
  } catch (error) {
    console.error("Error adding skill to user:", error);
    throw error;
  }
};

export const updateUserSkill = async (
  userId: string,
  skillId: string,
  skillData: Partial<Skill>
): Promise<Skill> => {
  const response = await api.put(
    `/users/${userId}/skills/${skillId}`,
    skillData
  );
  return response.data;
};

export const deleteUserSkill = async (
  userId: string,
  skillId: string
): Promise<void> => {
  await api.delete(`/users/${userId}/skills/${skillId}`);
};

// Skill Management
export const createSkill = async (
  skillData: Partial<Skill>
): Promise<Skill> => {
  const response = await api.post("/skills", skillData);
  return response.data;
};

export const getAllSkills = async (): Promise<Skill[]> => {
  const response = await api.get("/skills");
  return response.data;
};

export const getSkillById = async (skillId: string): Promise<Skill> => {
  const response = await api.get(`/skills/${skillId}`);
  return response.data;
};

export const updateSkill = async (
  skillId: string,
  skillData: Partial<Skill>
): Promise<Skill> => {
  const response = await api.put(`/skills/${skillId}`, skillData);
  return response.data;
};

export const deleteSkill = async (skillId: string): Promise<void> => {
  await api.delete(`/skills/${skillId}`);
};

// Messaging
// In MindsMeshAPI.ts
export const fetchUsersByRole = async (role: string): Promise<User[]> => {
  try {
    const response = await api.get("/users", {
      params: { role },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching users by role:", error);
    throw error;
  }
};

export const sendMessage = async (receiverId: string, formData: FormData) => {
  try {
    const response = await api.post(`/chat/${receiverId}/send`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};
export const getChatMessages = async (userId1: string, userId2: string) => {
  try {
    const response = await api.get(`/chat/${userId1}/${userId2}/messages`);
    return response.data;
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    throw error;
  }
};

export const getActiveChats = async (): Promise<User[]> => {
  try {
    const response = await api.get("/chat/active-chats");
    return response.data;
  } catch (error) {
    console.error("Error fetching active chats:", error);
    throw error;
  }
};

export const createRoom = async (freelancerId: string, roomName: string) => {
  try {
    const response = await api.post("/rooms/create", {
      freelancerId,
      roomName,
    });
    return response.data;
  } catch (error) {
    console.error("Error creating room:", error);
    throw error;
  }
};

export const getUnreadCounts = async (): Promise<{ [key: string]: number }> => {
  try {
    const response = await api.get("/chat/unread-counts");
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;

    if (axiosError.response && axiosError.response.status === 401) {
      // Token might be expired or invalid
      console.error("Authentication error. Redirecting to login...");
      // Optionally clear the token and redirect to the login page
      localStorage.removeItem("token");
      window.location.href = "/login";
    } else {
      console.error("Error fetching unread counts:", axiosError);
    }
    return {};
  }
};

export const fetchRoomsForFreelancer = async (
  freelancerId: string
): Promise<Room[]> => {
  try {
    const response = await api.get(`/rooms/freelancer/${freelancerId}`);
    console.log("Rooms fetched for freelancer:", response.data); // Add logging to confirm response data
    return response.data;
  } catch (error) {
    console.error("Error fetching rooms for freelancer:", error);
    throw error;
  }
};

export const uploadFile = async (
  receiverId: string,
  formData: FormData
): Promise<{ fileUrl: string; fileName: string; fileType: string }> => {
  try {
    const response = await api.post(`/chat/${receiverId}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};
