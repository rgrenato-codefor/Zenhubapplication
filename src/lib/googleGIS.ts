import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth, GOOGLE_CLIENT_ID } from "./firebase";

// ── Tipos do GIS ──────────────────────────────────────────────────────────────
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: (options?: { prompt?: string }) => void };
        };
      };
    };
  }
}

// ── Carrega o script GIS uma vez ──────────────────────────────────────────────
function loadGIS(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.getElementById("gis-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.id = "gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar Google Identity Services"));
    document.head.appendChild(script);
  });
}

// ── Sign-in via GIS + signInWithCredential (sem validação de domínio) ─────────
export async function signInWithGoogleGIS() {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "SEU_WEB_CLIENT_ID_AQUI") {
    throw new Error(
      "GOOGLE_CLIENT_ID não configurado. Adicione o Web Client ID em /src/lib/firebase.ts"
    );
  }

  await loadGIS();

  return new Promise<import("firebase/auth").UserCredential>((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "email profile openid",
      callback: async (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? "Sem access_token"));
          return;
        }
        try {
          // signInWithCredential NÃO valida o domínio de origem — contorna o unauthorized-domain
          const credential = GoogleAuthProvider.credential(null, response.access_token);
          const result = await signInWithCredential(auth, credential);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: "select_account" });
  });
}
