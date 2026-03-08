/**
 * useCepLookup — busca endereço via ViaCEP ao digitar um CEP válido (8 dígitos).
 *
 * Usage:
 *   const { cepStatus, lookupCep } = useCepLookup((addr) => {
 *     set("street",       addr.logradouro);
 *     set("neighborhood", addr.bairro);
 *     set("city",         addr.localidade);
 *     set("state",        addr.uf);
 *   });
 *
 * Then in the CEP input onChange:
 *   onChange={(e) => {
 *     const masked = maskCEP(e.target.value);
 *     set("cep", masked);
 *     lookupCep(masked);
 *   }}
 */

import { useState, useCallback, useRef } from "react";

export type CepStatus = "idle" | "loading" | "found" | "not_found" | "error";

export interface ViaCepAddress {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  complemento: string;
  erro?: boolean;
}

export function useCepLookup(onFound: (addr: ViaCepAddress) => void) {
  const [cepStatus, setCepStatus] = useState<CepStatus>("idle");
  const abortRef = useRef<AbortController | null>(null);

  const lookupCep = useCallback(
    async (maskedOrRaw: string) => {
      // Strip mask to get raw digits
      const raw = maskedOrRaw.replace(/\D/g, "");

      // Only fire when we have exactly 8 digits
      if (raw.length !== 8) {
        setCepStatus("idle");
        return;
      }

      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setCepStatus("loading");

      try {
        const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("HTTP error");

        const data: ViaCepAddress = await res.json();

        if (data.erro) {
          setCepStatus("not_found");
          return;
        }

        setCepStatus("found");
        onFound(data);
      } catch (err: any) {
        if (err?.name === "AbortError") return; // cancelled, keep previous state
        setCepStatus("error");
      }
    },
    [onFound]
  );

  return { cepStatus, lookupCep };
}
