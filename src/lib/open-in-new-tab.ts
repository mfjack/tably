export type PendingTab = {
  navigate: (url: string) => void;
  close: () => void;
};

export function openPendingTab(): PendingTab {
  const pendingWindow = window.open("", "_blank");
  return {
    navigate: (url) => {
      if (pendingWindow) pendingWindow.location.href = url;
      else window.location.assign(url);
    },
    close: () => pendingWindow?.close(),
  };
}
