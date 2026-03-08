/**
 * Firebase Storage — upload e exclusão de mídia
 *
 * Substitui o ImageKit no upload de galeria do terapeuta/empresa.
 * Usa o bucket já configurado em firebase.ts (zen-hub-f61be.firebasestorage.app).
 *
 * path sugerido: "therapists/{id}/gallery"  |  "companies/{id}/gallery"
 */

import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import app from "./firebase";
import type { MediaItem } from "./imagekit";

const storage = getStorage(app);

/** Faz upload de um File para o Firebase Storage e retorna um MediaItem. */
export async function uploadToStorage(
  file: File,
  folder: string,                         // ex: "therapists/abc123/gallery"
  onProgress?: (pct: number) => void,
): Promise<MediaItem> {
  const isVideo  = file.type.startsWith("video/");
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const storageRef = ref(storage, `${folder}/${safeName}`);

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onProgress?.(pct);
      },
      reject,
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({
            id:         `fs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            type:       isVideo ? "video" : "image",
            url,
            fileId:     storageRef.fullPath,   // caminho completo para deletar depois
            uploadedAt: new Date().toISOString(),
          });
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}

/** Exclui um arquivo do Firebase Storage pelo seu fullPath (campo fileId). */
export async function deleteFromStorage(fileId?: string): Promise<void> {
  if (!fileId) return;
  try {
    await deleteObject(ref(storage, fileId));
  } catch {
    // Ignora silenciosamente (arquivo já excluído, sem permissão etc.)
  }
}
