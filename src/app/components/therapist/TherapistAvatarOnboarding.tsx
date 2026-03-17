/**
 * TherapistAvatarOnboarding
 *
 * Exibida no primeiro login (ou em qualquer login) quando o terapeuta
 * ainda não tem foto de avatar. Cobre toda a tela por cima do layout.
 *
 * Comportamento:
 *  - Upload → salva avatar, fecha tela (não exibe mais)
 *  - Pular  → grava flag na sessionStorage, fecha tela até o próximo login
 */

import { useRef, useState } from "react";
import { Camera, CheckCircle, X, ArrowRight } from "../shared/icons";
import { uploadMedia, ikFolders } from "../../../lib/imagekit";

interface Props {
  therapistId: string;
  therapistName: string;
  onUploaded: (url: string) => Promise<void>;
  onSkip: () => void;
}

export function TherapistAvatarOnboarding({
  therapistId,
  therapistName,
  onUploaded,
  onSkip,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);
  const [error, setError]         = useState("");
  const [done, setDone]           = useState(false);
  const [dragging, setDragging]   = useState(false);

  const firstName = therapistName.split(" ")[0];

  async function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Apenas imagens são aceitas (JPG, PNG, WEBP…)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("O arquivo deve ter no máximo 10 MB.");
      return;
    }

    setError("");
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);
    setProgress(0);

    try {
      const item = await uploadMedia(
        file,
        ikFolders.therapistAvatar(therapistId),
        setProgress,
      );
      setDone(true);
      // Breve pausa para mostrar o feedback de sucesso antes de fechar
      setTimeout(async () => {
        await onUploaded(item.url);
      }, 900);
    } catch {
      setError("Falha no upload. Verifique sua conexão e tente novamente.");
      setPreview(null);
      setUploading(false);
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) processFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-4">

      {/* Skip button — top right */}
      <button
        onClick={onSkip}
        className="absolute top-5 right-5 flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
        Pular por agora
      </button>

      {/* Content — sem card */}
      <div className="w-full max-w-md">

        <div className="p-8">

          {/* Icon + title */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
              <Camera className="w-8 h-8 text-violet-600" />
            </div>
            <h1 className="text-gray-900 text-2xl" style={{ fontWeight: 700 }}>
              Olá, {firstName}! 👋
            </h1>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed max-w-xs">
              Adicione uma foto de perfil para que seus clientes possam te reconhecer facilmente.
            </p>
          </div>

          {/* Upload area */}
          <div
            onClick={() => !uploading && !done && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all cursor-pointer select-none
              ${done
                ? "border-emerald-300 bg-emerald-50"
                : dragging
                ? "border-violet-400 bg-violet-50 scale-[1.01]"
                : "border-violet-200 bg-violet-50/50 hover:border-violet-400 hover:bg-violet-50"
              }
              ${uploading ? "cursor-default" : ""}
            `}
            style={{ minHeight: 180 }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleInput}
            />

            {/* Preview */}
            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-20"
              />
            )}

            <div className="relative z-10 flex flex-col items-center gap-3 py-8 px-6 text-center">
              {done ? (
                <>
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-emerald-400">
                    <img src={preview!} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-600" style={{ fontWeight: 600 }}>
                    <CheckCircle className="w-5 h-5" />
                    Foto salva com sucesso!
                  </div>
                </>
              ) : uploading ? (
                <>
                  {preview && (
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-violet-300 mb-1">
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="w-full max-w-[180px]">
                    <div className="w-full bg-violet-100 rounded-full h-2 mb-2">
                      <div
                        className="h-2 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-violet-600 text-sm" style={{ fontWeight: 600 }}>
                      Enviando… {progress}%
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center">
                    <Camera className="w-7 h-7 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-violet-700 text-sm" style={{ fontWeight: 600 }}>
                      Clique ou arraste sua foto aqui
                    </p>
                    <p className="text-gray-400 text-xs mt-1">JPG, PNG ou WEBP · Máx. 10 MB</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="mt-3 text-sm text-red-500 text-center">{error}</p>
          )}

          {/* CTA */}
          {!uploading && !done && (
            <button
              onClick={() => inputRef.current?.click()}
              className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white transition-all hover:shadow-lg hover:shadow-violet-200 active:scale-[0.98]"
              style={{ fontWeight: 600 }}
            >
              <Camera className="w-4 h-4" />
              Escolher foto
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {/* Skip link */}
          {!done && (
            <button
              onClick={onSkip}
              className="mt-3 w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
            >
              Pular por agora — farei isso depois
            </button>
          )}
        </div>
      </div>

      {/* Subtle footnote */}
      <p className="mt-6 text-xs text-gray-400 text-center">
        Você pode adicionar ou alterar sua foto a qualquer momento no <strong>Perfil</strong>.
      </p>
    </div>
  );
}