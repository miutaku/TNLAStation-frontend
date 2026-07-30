self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // TNLAStationのAPIや映像をキャッシュせず、ブラウザーの通常取得に委ねる。
});
