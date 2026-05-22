"use client";

import { useEffect, useReducer, useRef } from "react";
import { useAccount } from "wagmi";
import { fetchHolderTokens } from "@/lib/normies-api";
import NormieCard from "./NormieCard";

type State = {
  tokenIds: number[];
  status: "idle" | "loading" | "error" | "ready";
  errorMsg: string | null;
};

type Action =
  | { type: "reset" }
  | { type: "loading" }
  | { type: "success"; tokenIds: number[] }
  | { type: "error"; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "reset":
      return { tokenIds: [], status: "idle", errorMsg: null };
    case "loading":
      return { ...state, status: "loading", errorMsg: null };
    case "success":
      return { tokenIds: action.tokenIds, status: "ready", errorMsg: null };
    case "error":
      return { ...state, status: "error", errorMsg: action.message };
  }
}

export default function NormieGrid() {
  const { address } = useAccount();
  const [state, dispatch] = useReducer(reducer, {
    tokenIds: [],
    status: "idle",
    errorMsg: null,
  });
  const activeRequest = useRef(0);

  useEffect(() => {
    if (!address) {
      ++activeRequest.current;
      dispatch({ type: "reset" });
      return;
    }

    const requestId = ++activeRequest.current;
    dispatch({ type: "loading" });

    fetchHolderTokens(address)
      .then((ids) => {
        if (requestId !== activeRequest.current) return;
        dispatch({ type: "success", tokenIds: ids });
      })
      .catch(() => {
        if (requestId !== activeRequest.current) return;
        dispatch({ type: "error", message: "Failed to load your Normies" });
      });

    return () => {
      activeRequest.current++;
    };
  }, [address]);

  if (!address) return null;

  if (state.status === "loading") {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 text-[var(--text-muted)] text-sm">
          <div className="w-4 h-4 border-2 border-[var(--text-muted)] border-t-[var(--accent-glow)] rounded-full animate-spin" />
          Loading your Normies...
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--seal-bg)] text-sm">{state.errorMsg}</p>
      </div>
    );
  }

  if (state.tokenIds.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)] text-sm mb-3">
          You don&apos;t own any Normies yet.
        </p>
        <a
          href="https://opensea.io/collection/normies"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent-glow)] hover:opacity-80 text-sm transition-opacity"
        >
          Browse on OpenSea →
        </a>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-headline text-xl font-semibold text-[var(--text-primary)] mb-4">
        Your Normies ({state.tokenIds.length})
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {state.tokenIds.map((id) => (
          <NormieCard key={id} tokenId={id} />
        ))}
      </div>
    </div>
  );
}
