"use client";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
  photo_url?: string;
}

const TelegramLoginButton = () => {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid");

  // Check if user exists on component mount
  useEffect(() => {
    const checkExistingUser = async () => {
      if (!uid) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`/api/proxy/user/${uid}`);
        if (response.data) {
          console.log(response.data);
          setUser({
            id: response.data.telegramId,
            username: response.data.telegramUsername,
          });
        }
      } catch (error) {
        console.log("User not found, showing login button");
      } finally {
        setLoading(false);
      }
    };

    checkExistingUser();
  }, [uid]);

  useEffect(() => {
    if (!uid || loading || user) return;

    // Load Telegram Widget Script
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", "OmiverseBot");
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-userpic", "true");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.async = true;

    // Add the script to the document
    const container = document.getElementById("telegram-login-container");
    if (container) {
      container.appendChild(script);
    }

    // Define the callback function
    window.onTelegramAuth = async (userData: TelegramUser) => {
      try {
        // Set user data immediately to show profile
        setUser(userData);

        // Store user data in MongoDB
        try {
          console.log("Sending user data to backend:", {
            userId: uid,
            telegramId: userData.id,
            telegramUsername: userData.username || "",
          });

          const result = await axios.post(
            "/api/proxy/user/auth",
            {
              userId: uid,
              telegramId: userData.id,
              telegramUsername: userData.username || "",
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          console.log("Backend response:", result.data);

          if (result.data.success) {
            console.log("User information stored successfully:", result.data);
            localStorage.setItem("telegramUser", JSON.stringify(userData));
          } else {
            console.error(
              "Failed to store user information:",
              result.data.error
            );
          }
        } catch (error) {
          console.error("Error storing user information:", error);
        }
      } catch (error) {
        console.error("Authentication failed:", error);
      }
    };

    return () => {
      // Cleanup
      if (container) {
        const script = container.querySelector("script");
        if (script) {
          container.removeChild(script);
        }
      }
    };
  }, [uid, loading, user]);

  if (!uid) {
    return (
      <div className="text-red-400 bg-red-900/20 px-4 py-2 rounded-lg ring-1 ring-red-800">
        Error: No UID provided in URL parameters
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-400"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4 w-full max-w-md mx-auto">
      {user ? (
        <div className="flex flex-col items-center space-y-2 p-8 bg-zinc-900 rounded-xl ring-1 ring-zinc-700 w-full">
          <div className="text-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-700 flex items-center justify-center mb-6 shadow-lg ring-1 ring-zinc-600">
                {user.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt="Profile"
                    className="w-24 h-24 rounded-xl object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-zinc-300">
                    {user.username ? user.username[0].toUpperCase() : "U"}
                  </span>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-zinc-700 rounded-full p-1.5 ring-1 ring-zinc-600">
                <svg
                  className="w-3 h-3 text-zinc-300"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-zinc-200">
              {user.first_name || "Telegram User"}
            </h2>
            <div className="space-y-1">
              <p className="text-zinc-400 text-sm">
                <span className="text-zinc-500">ID:</span> {user.id}
              </p>
              {user.username && (
                <p className="text-zinc-400 text-sm">
                  <span className="text-zinc-500">Username:</span> @
                  {user.username}
                </p>
              )}
            </div>
          </div>
          <div className="mt-6 flex items-center space-x-2 text-sm text-zinc-400">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Authenticated with Telegram</span>
          </div>
        </div>
      ) : (
        <div
          id="telegram-login-container"
          className="p-8 bg-zinc-900 rounded-xl ring-1 ring-zinc-700 w-full"
        ></div>
      )}
    </div>
  );
};

export default function Page() {
  return (
    <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <h1 className="text-3xl font-bold text-center text-zinc-200">
          Welcome to <span className="text-zinc-300">Omiverse</span>
        </h1>
        <TelegramLoginButton />
      </div>
    </div>
  );
}

declare global {
  interface Window {
    onTelegramAuth: (user: any) => void;
  }
}
