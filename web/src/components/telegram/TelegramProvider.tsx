import { ReactNode, useEffect } from "react";

interface TelegramProviderProps {
  children: ReactNode;
}

export function TelegramProvider({ children }: TelegramProviderProps) {
  useEffect(() => {
    // Dynamic import of Telegram WebApp SDK
    import("@twa-dev/sdk").then((WebApp) => {
      // Initialize Telegram WebApp
      WebApp.default.ready();

      // Configure the main button if needed
      WebApp.default.MainButton.setParams({
        text: "CONTINUE",
        color: "#2ea6ff",
      });
      WebApp.default.MainButton.hide();

      // Set viewport settings
      WebApp.default.setHeaderColor("#2ea6ff");
      WebApp.default.expand();
    });

    return () => {
      // Cleanup if necessary
      import("@twa-dev/sdk").then((WebApp) => {
        WebApp.default.MainButton.hide();
      });
    };
  }, []);

  return <>{children}</>;
}
