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
      <div className="text-red-400/90 bg-red-500/10 px-6 py-4 rounded-xl border border-red-500/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>No UID provided in URL parameters</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-400 border-t-zinc-200"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4 w-full max-w-md mx-auto">
      {user ? (
        <div className="flex flex-col items-center space-y-2 p-8 bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 w-full">
          <div className="text-center mb-5">
            <div className="relative inline-block">
              <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-700/50 flex items-center justify-center mb-3 shadow-xl ring-1 ring-zinc-700/50 backdrop-blur-sm">
                {user.photo_url ? (
                  <img
                    src={user.photo_url}
                    alt="Profile"
                    className="w-28 h-28 rounded-2xl object-cover"
                  />
                ) : (
                  <span className="text-4xl font-bold text-zinc-300">
                    {user.username ? user.username[0].toUpperCase() : "U"}
                  </span>
                )}
              </div>
            </div>
            <h2 className="flex items-center gap-2 text-2xl font-bold mb-8 text-white">
              {user.first_name || "Telegram User"} <div className=" bg-emerald-500/90 rounded-full p-1.5 shadow-lg border border-emerald-400/20 backdrop-blur-sm">
                <svg
                  className="w-3.5 h-3.5 text-white"
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
            </h2>
            <div className="space-y-2">
              <p className="text-zinc-300 text-sm bg-zinc-800/50 px-4 py-2 rounded-lg backdrop-blur-sm border border-zinc-700/50">
                <span className="text-zinc-400">#</span> {user.id}
              </p>
              {user.username && (
                <p className="text-zinc-300 text-sm bg-zinc-800/50 px-4 py-2 rounded-lg backdrop-blur-sm border border-zinc-700/50">
                  @{user.username}
                </p>
              )}
            </div>
          </div>
          <div className="mt-10 flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20 backdrop-blur-sm">
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
            <span>Successfully authenticated with Telegram</span>
          </div>
        </div>
      ) : (
        <div
          id="telegram-login-container"
          className="p-8 bg-zinc-900/50 backdrop-blur-sm rounded-2xl border border-zinc-800/50 w-full"
        ></div>
      )}
    </div>
  );
};

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-58">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 to-zinc-400">
            Welcome to omiverse
          </h1>
          <p className="text-zinc-400">Connect your Telegram account to setup your second brain</p>
        </div>
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
