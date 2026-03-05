interface Props {
  currentStep: number;
}

const STEPS = [
  { num: 1, label: "Site Config" },
  { num: 2, label: "Topics & Write" },
  { num: 3, label: "Review & Edit" },
  { num: 4, label: "Generate Site" },
];

export default function StepIndicator({ currentStep }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: "48px" }}>
      {STEPS.map((step, idx) => (
        <div key={step.num} style={{ display: "flex", alignItems: "center", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--mono)",
                fontSize: "11px",
                fontWeight: 700,
                flexShrink: 0,
                border: "1px solid",
                transition: "all 0.2s",
                borderColor:
                  step.num < currentStep
                    ? "var(--success)"
                    : step.num === currentStep
                    ? "var(--accent)"
                    : "var(--border)",
                background:
                  step.num < currentStep
                    ? "var(--success)"
                    : step.num === currentStep
                    ? "var(--accent)"
                    : "var(--bg-card)",
                color:
                  step.num < currentStep
                    ? "#000"
                    : step.num === currentStep
                    ? "#fff"
                    : "var(--text-tertiary)",
              }}
            >
              {step.num < currentStep ? "✓" : step.num}
            </div>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "10px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color:
                  step.num === currentStep
                    ? "var(--text-primary)"
                    : step.num < currentStep
                    ? "var(--success)"
                    : "var(--text-tertiary)",
                whiteSpace: "nowrap",
              }}
            >
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div
              style={{
                flex: 1,
                height: "1px",
                background: step.num < currentStep ? "var(--success)" : "var(--border)",
                margin: "0 8px",
                transition: "background 0.2s",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
