"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TailorButtonProps {
  onClick: () => Promise<void>;
  disabled?: boolean;
}

export function TailorButton({ onClick, disabled }: TailorButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [eta, setEta] = useState<number | null>(null);

  const handleClick = async () => {
    setIsLoading(true);
    setEta(30);
    const timer = setInterval(() => {
      setEta((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);

    try {
      await onClick();
    } finally {
      clearInterval(timer);
      setIsLoading(false);
      setEta(null);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className="w-full"
      size="lg"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Tailoring... {eta !== null && `(~${eta}s remaining)`}
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Tailored Resume
        </>
      )}
    </Button>
  );
}