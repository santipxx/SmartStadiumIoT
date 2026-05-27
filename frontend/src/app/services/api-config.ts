type SmartStadiumConfig = {
  apiUrl?: string;
};

declare global {
  interface Window {
    smartStadiumConfig?: SmartStadiumConfig;
  }
}

export const API_BASE_URL =
  window.smartStadiumConfig?.apiUrl?.replace(/\/$/, '') ??
  'http://localhost:3000';
