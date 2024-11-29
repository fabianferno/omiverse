"use client";
import axios from "axios";
import React, { useEffect, useState } from "react";

interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
  photo_url?: string;
}

const TelegramLoginButton = () => {
  const [user, setUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    // Load Telegram Widget Script
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", "OmiverseBot"); // Use your exact bot username without @
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
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

        // Send the authentication data to your backend
        const response = await axios.post("/api/auth/telegram", userData);

        if (response.data.success) {
          // Store user data in localStorage
          localStorage.setItem("telegramUser", JSON.stringify(userData));

          // Wait a moment to show the profile before redirecting
          setTimeout(() => {
            window.location.href = "/"; // Redirect to home page or dashboard
          }, 2000);
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
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4">
      {user ? (
        <div className="flex flex-col items-center space-y-2 mb-4">
          {user.photo_url && (
            <img
              src={user.photo_url}
              alt="Profile"
              className="w-20 h-20 rounded-full border-2 border-blue-500"
            />
          )}
          <div className="text-center">
            <p className="font-bold">{user.first_name}</p>
            <p className="text-gray-600">ID: {user.id}</p>
            {user.username && <p className="text-gray-600">@{user.username}</p>}
          </div>
        </div>
      ) : (
        <div
          id="telegram-login-container"
          className="flex justify-center"
        ></div>
      )}
    </div>
  );
};

const page = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">
          Login with Telegram
        </h1>
        <div className="text-center text-gray-600 mb-6">
          Click the button below to login with your Telegram account
        </div>
        <TelegramLoginButton />
      </div>
    </div>
  );
};

export default page;

// Add TypeScript type declaration for the global window object
declare global {
  interface Window {
    onTelegramAuth: (user: any) => void;
  }
}
