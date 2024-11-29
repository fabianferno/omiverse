import WebApp from "@twa-dev/sdk";
import { useCallback } from "react";

export function useTelegram() {
  const showMainButton = useCallback((text: string, onClick: () => void) => {
    WebApp.MainButton.setText(text);
    WebApp.MainButton.onClick(onClick);
    WebApp.MainButton.show();
  }, []);

  const hideMainButton = useCallback(() => {
    WebApp.MainButton.hide();
  }, []);

  const closeApp = useCallback(() => {
    WebApp.close();
  }, []);

  const expandApp = useCallback(() => {
    WebApp.expand();
  }, []);

  const getUserData = useCallback(() => {
    return WebApp.initDataUnsafe.user;
  }, []);

  return {
    showMainButton,
    hideMainButton,
    closeApp,
    expandApp,
    getUserData,
    webApp: WebApp,
  };
}
