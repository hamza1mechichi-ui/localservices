"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
      return;
    }

    // Auto-réparation pour le développement : un Service Worker enregistré lors
    // d'une session précédente continue de servir de vieux chunks JS en cache
    // (y compris une ancienne version de ce fichier qui se réenregistrerait
    // elle-même en boucle). On le désinstalle activement et on vide les caches
    // pour casser ce cycle, sans action manuelle requise dans les DevTools.
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) reg.unregister();
    });
    if ("caches" in window) {
      caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
    }
  }, []);

  return null;
}
