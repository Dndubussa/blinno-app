import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { cn } from "@/lib/utils";

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const AnimatedSection = ({ children, className, delay = 0 }: AnimatedSectionProps) => {
  const { ref, isVisible } = useScrollAnimation({
    threshold: 0.1,
    triggerOnce: true,
  });

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-10",
        className
      )}
      style={{
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};
