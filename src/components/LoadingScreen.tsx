import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";

export const LoadingScreen = ({ onLoadingComplete }: { onLoadingComplete: () => void }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onLoadingComplete, 300); // Wait for fade-out animation
    }, 2000);

    return () => clearTimeout(timer);
  }, [onLoadingComplete]);

  if (!isVisible) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center animate-fade-out pointer-events-none">
        <div className="flex flex-col items-center gap-4">
          <img src={logo} alt="BLINNO" className="w-24 h-24 animate-pulse" />
          <div className="text-2xl font-bold text-primary">BLINNO</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center animate-fade-in">
      <div className="flex flex-col items-center gap-4">
        <img src={logo} alt="BLINNO" className="w-24 h-24 animate-pulse" />
        <div className="text-2xl font-bold text-primary">BLINNO</div>
      </div>
    </div>
  );
};
