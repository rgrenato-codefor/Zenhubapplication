/**
 * ImageKit — Upload, Delete e Helpers de URL
 *
 * Endpoint : https://ik.imagekit.io/dibcppssk1
 * Raiz CDN : zenhub-application/
 *
 * Estrutura de pastas:
 *   zenhub-application/therapists/{therapistId}/gallery/   → galeria do terapeuta
 *   zenhub-application/therapists/{therapistId}/avatar/    → foto de perfil
 *   zenhub-application/companies/{companyId}/gallery/      → galeria da empresa
 *   zenhub-application/companies/{companyId}/logo/         → logo da empresa
 *   zenhub-application/companies/{companyId}/units/{unitId}/gallery/
 *
 * ⚠️  A private key está exposta no bundle client-side.
 *     Em produção, mova a autenticação para um endpoint seguro (ex: Firebase Function).
 */

// ─── Credenciais ──────────────────────────────────────────────────────────────
const IK_URL_ENDPOINT = "https://ik.imagekit.io/dibcppssk1";
const IK_PUBLIC_KEY   = "public_o2tsisl426tzYqbff5njz+ThOwg=";
const IK_PRIVATE_KEY  = "private_9UOAjuI5TF9K+9tafKkP2D4B4nU=";
const IK_UPLOAD_URL   = "https://upload.imagekit.io/api/v1/files/upload";
const IK_API_URL      = "https://api.imagekit.io/v1";
const IK_ROOT_FOLDER  = "zenhub-application";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type MediaItem = {
  id: string;
  /** "image" ou "video" */
  type: "image" | "video";
  /** URL pública no CDN do ImageKit */
  url: string;
  /** fileId do ImageKit — necessário para exclusão */
  fileId?: string;
  /** Thumbnail para vídeos (gerada automaticamente pelo IK) */
  thumbnailUrl?: string;
  caption?: string;
  uploadedAt: string;
};

/** Parâmetros de transformação ImageKit (subset dos mais usados) */
export type IkTransform = {
  w?: number;   // width
  h?: number;   // height
  /** crop mode: "at_max" | "at_least" | "force" | "maintain_ratio" */
  c?: string;
  /** focus: "auto" | "face" | "center" */
  fo?: string;
  /** blur: 1-100 */
  bl?: number;
  /** format: "auto" | "webp" | "jpg" */
  f?: string;
  /** quality: 1-100 */
  q?: number;
};

// ─── Helpers de pasta ─────────────────────────────────────────────────────────

/** Retorna o caminho de pasta ImageKit para o contexto dado */
export const ikFolders = {
  therapistGallery: (therapistId: string) =>
    `/${IK_ROOT_FOLDER}/therapists/${therapistId}/gallery`,
  therapistAvatar: (therapistId: string) =>
    `/${IK_ROOT_FOLDER}/therapists/${therapistId}/avatar`,
  companyGallery: (companyId: string) =>
    `/${IK_ROOT_FOLDER}/companies/${companyId}/gallery`,
  companyLogo: (companyId: string) =>
    `/${IK_ROOT_FOLDER}/companies/${companyId}/logo`,
  unitGallery: (companyId: string, unitId: string) =>
    `/${IK_ROOT_FOLDER}/companies/${companyId}/units/${unitId}/gallery`,
} as const;

// ─── Helper de URL com transformação ─────────────────────────────────────────

/**
 * Gera uma URL ImageKit com transformações opcionais.
 *
 * @example
 * ikUrl("https://ik.imagekit.io/dibcppssk1/zenhub-application/...")
 * ikUrl(rawUrl, { w: 300, h: 300, c: "at_max", fo: "auto" })
 * ikUrl(rawUrl, { bl: 10 })
 */
export function ikUrl(rawUrl: string, transform?: IkTransform): string {
  if (!rawUrl || !transform) return rawUrl;

  const parts: string[] = [];
  if (transform.w)  parts.push(`w-${transform.w}`);
  if (transform.h)  parts.push(`h-${transform.h}`);
  if (transform.c)  parts.push(`c-${transform.c}`);
  if (transform.fo) parts.push(`fo-${transform.fo}`);
  if (transform.bl) parts.push(`bl-${transform.bl}`);
  if (transform.f)  parts.push(`f-${transform.f}`);
  if (transform.q)  parts.push(`q-${transform.q}`);

  if (parts.length === 0) return rawUrl;

  const sep = rawUrl.includes("?") ? "&" : "?";
  return `${rawUrl}${sep}tr=${parts.join(",")}`;
}

/**
 * URL de thumbnail quadrado para uso em grids (ex: galeria 3 colunas).
 * Retorna a URL original se ela não vier do ImageKit.
 */
export function ikThumb(url: string, size = 400): string {
  if (!url || !url.includes("ik.imagekit.io")) return url;
  return ikUrl(url, { w: size, h: size, c: "at_max", fo: "auto", f: "auto", q: 80 });
}

/** URL de avatar circular (quadrado pequeno otimizado). */
export function ikAvatar(url: string, size = 200): string {
  if (!url || !url.includes("ik.imagekit.io")) return url;
  return ikUrl(url, { w: size, h: size, c: "at_max", fo: "face", f: "auto", q: 85 });
}

// ─── Auth header (Basic Auth com private key) ─────────────────────────────────
function ikAuthHeader(): string {
  return `Basic ${btoa(`${IK_PRIVATE_KEY}:`)}`;
}

export function isImageKitConfigured(): boolean {
  return IK_PRIVATE_KEY.length > 0 && IK_URL_ENDPOINT.length > 0;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Faz upload de um arquivo para o ImageKit.
 *
 * @param file        Arquivo selecionado pelo usuário
 * @param folder      Caminho da pasta no IK (use `ikFolders.*`)
 * @param onProgress  Callback com progresso 0-100
 */
export async function uploadMedia(
  file: File,
  folder: string = `/${IK_ROOT_FOLDER}`,
  onProgress?: (pct: number) => void,
): Promise<MediaItem> {
  const isVideo  = file.type.startsWith("video/");
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  return new Promise((resolve, reject) => {
    const xhr  = new XMLHttpRequest();
    const body = new FormData();
    body.append("file",            file);
    body.append("fileName",        safeName);
    body.append("folder",          folder);
    body.append("useUniqueFileName", "true");

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 92));
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        const d = JSON.parse(xhr.responseText) as {
          fileId: string;
          url: string;
          filePath: string;
          name: string;
        };

        // Para vídeos, IK gera thumbnail automático no segundo 2
        const thumbPath = isVideo
          ? `${IK_URL_ENDPOINT}/tr:so-2,h-300,w-400,f-jpg${d.filePath}`
          : undefined;

        resolve({
          id:           d.fileId,
          type:         isVideo ? "video" : "image",
          url:          d.url,
          fileId:       d.fileId,
          thumbnailUrl: thumbPath,
          uploadedAt:   new Date().toISOString(),
        });
      } else {
        reject(new Error(`ImageKit upload falhou (HTTP ${xhr.status}): ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Erro de rede durante o upload"));
    xhr.open("POST", IK_UPLOAD_URL);
    xhr.setRequestHeader("Authorization", ikAuthHeader());
    xhr.send(body);
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/** Remove um arquivo do ImageKit pelo seu fileId. */
export async function deleteMedia(fileId?: string): Promise<void> {
  if (!fileId) return;
  try {
    await fetch(`${IK_API_URL}/files/${fileId}`, {
      method:  "DELETE",
      headers: { Authorization: ikAuthHeader() },
    });
  } catch {
    // Ignora erros de exclusão silenciosamente
  }
}

// Re-export chave pública para uso com o SDK client (ex: autenticação por endpoint)
export { IK_URL_ENDPOINT, IK_PUBLIC_KEY };
