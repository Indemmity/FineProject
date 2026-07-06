"use client";

import { useState, useEffect, createContext, useContext, type ReactNode } from "react";

interface Step {
  target: string;
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface OnboardingContext {
  active: boolean;
  currentStep: number;
  totalSteps: number;
  start: () => void;
  next: () => void;
  prev: () => void;
  dismiss: () => void;
}

const OnboardingCtx = createContext<OnboardingContext | null>(null);

export function OnboardingProvider({ steps, children }: { steps: Step[]; children: ReactNode }) {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem("onboarding-seen");
    if (!seen) {
      setTimeout(() => setActive(true), 500);
    }
  }, []);

  const complete = () => {
    localStorage.setItem("onboarding-seen", "true");
    setActive(false);
  };

  const ctx: OnboardingContext = {
    active,
    currentStep,
    totalSteps: steps.length,
    start: () => setActive(true),
    next: () => {
      if (currentStep < steps.length - 1) setCurrentStep((s) => s + 1);
      else complete();
    },
    prev: () => setCurrentStep((s) => Math.max(0, s - 1)),
    dismiss: complete,
  };

  return (
    <OnboardingCtx.Provider value={ctx}>
      {children}
      {active && steps[currentStep] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="mx-4 max-w-sm rounded-lg bg-background p-6 shadow-xl">
            <div className="mb-1 text-xs text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </div>
            <h3 className="text-lg font-semibold">{steps[currentStep].title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{steps[currentStep].content}</p>
            <div className="mt-4 flex justify-between">
              <button onClick={ctx.prev} className="text-sm text-muted-foreground hover:underline" disabled={currentStep === 0}>
                Previous
              </button>
              <button onClick={ctx.next} className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground">
                {currentStep < steps.length - 1 ? "Next" : "Get Started"}
              </button>
            </div>
          </div>
        </div>
      )}
    </OnboardingCtx.Provider>
  );
}

export function useOnboarding(): OnboardingContext {
  const ctx = useContext(OnboardingCtx);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}