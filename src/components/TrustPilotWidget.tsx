import { useEffect } from "react";

interface TrustPilotWidgetProps {
  className?: string;
}

export const TrustPilotWidget = ({ className = "" }: TrustPilotWidgetProps) => {
  useEffect(() => {
    // Check if script is already loaded
    const existingScript = document.querySelector('script[src*="trustpilot"]');
    if (existingScript) {
      return; // Script already loaded
    }

    // Load TrustPilot script
    const script = document.createElement("script");
    script.src = "https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js";
    script.async = true;
    script.type = "text/javascript";
    document.body.appendChild(script);

    // TrustPilot will automatically initialize widgets when script loads
  }, []);

  return (
    <div className={`${className} flex flex-col items-center gap-2`}>
      {/* TrustBox widget - Review Collector */}
      <div
        className="trustpilot-widget"
        data-locale="en-US"
        data-template-id="56278e9abfbbba0bdcd568bc"
        data-businessunit-id="6929c99e4228c640d12871ed"
        data-style-height="52px"
        data-style-width="100%"
        data-token="4eb47022-cc7b-4867-bc8b-b06b9f6257dc"
      >
        <a
          href="https://www.trustpilot.com/review/blinno.app"
          target="_blank"
          rel="noopener"
        >
          Trustpilot
        </a>
      </div>
      {/* End TrustBox widget */}
      
      {/* TrustPilot Logo */}
      <img 
        src="/TrustPilot.png" 
        alt="TrustPilot" 
        className="h-6 w-auto mt-2"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </div>
  );
};

