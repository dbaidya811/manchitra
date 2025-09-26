"use client";

type LoaderProps = {
  size?: "sm" | "md";
  className?: string;
};

export function Loader({ size = "md", className }: LoaderProps) {
  const d = size === "sm" ? 16 : 48; // dimension
  const shadowTop = Math.round(d * 1.25);
  const shadowH = Math.max(3, Math.round(d / 16 * 5));
  return (
    <div
      className={`ai-loader ${className || ""}`}
      style={{
        // @ts-ignore css vars
        "--d": `${d}px`,
        "--shadowTop": `${shadowTop}px`,
        "--shadowH": `${shadowH}px`,
      }}
    >
      <style jsx>{`
        .ai-loader {
          width: var(--d);
          height: var(--d);
          margin: auto;
          position: relative;
          display: inline-block;
        }
        .ai-loader:before {
          content: '';
          width: var(--d);
          height: var(--shadowH);
          background: #000;
          opacity: 0.25;
          position: absolute;
          top: var(--shadowTop);
          left: 0;
          border-radius: 50%;
          animation: ai-shadow 0.5s linear infinite;
        }
        .ai-loader:after {
          content: '';
          width: 100%;
          height: 100%;
          background: #fff;
          animation: ai-bxSpin 0.5s linear infinite;
          position: absolute;
          top: 0;
          left: 0;
          border-radius: 4px;
        }
        @keyframes ai-bxSpin {
          17% { border-bottom-right-radius: 3px; }
          25% { transform: translateY(calc(var(--d) * 0.1875)) rotate(22.5deg); }
          50% { transform: translateY(calc(var(--d) * 0.375)) scale(1, .9) rotate(45deg); border-bottom-right-radius: 40px; }
          75% { transform: translateY(calc(var(--d) * 0.1875)) rotate(67.5deg); }
          100% { transform: translateY(0) rotate(90deg); }
        }

        @keyframes ai-shadow {
          0%, 100% { transform: scale(1, 1); }
          50% { transform: scale(1.2, 1); }
        }
      `}</style>
    </div>
  );
}
