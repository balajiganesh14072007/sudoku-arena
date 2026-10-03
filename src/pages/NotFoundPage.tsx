import React from "react";
import { ArrowLeft } from "lucide-react";

interface NotFoundPageProps {
  navigate: (to: string) => void;
}

export function NotFoundPage({ navigate }: NotFoundPageProps) {
  return (
    <main className="wrap">
      <div
        className="panel pad"
        style={{ maxWidth: 500, margin: "70px auto", textAlign: "center" }}
      >
        <div className="eyebrow">Wrong turn</div>
        <h1 className="display" style={{ fontSize: 48, margin: "14px 0" }}>
          That grid is gone.
        </h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Let’s get you back to a puzzle that’s ready to play.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="btn"
          data-testid="link-return-lobby"
        >
          <ArrowLeft size={15} /> Back to the lobby
        </button>
      </div>
    </main>
  );
}
