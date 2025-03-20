let isOnline = navigator.onLine;

window.addEventListener('online', () => {
  isOnline = true;
});

window.addEventListener('offline', () => {
  isOnline = false;
});

export function isOffline(): boolean {
  return !isOnline;
}