import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import pengioLogo from "@/assets/pengio-logo.png";

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-primary overflow-hidden">
      {/* Wavy overlays */}
      <svg
        viewBox="0 0 400 800"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        <path
          d="M-50,200 Q50,150 150,220 Q250,290 350,200 Q450,110 550,250 L550,800 L-50,800 Z"
          fill="hsl(43, 80%, 48%)"
          opacity="0.3"
        />
        <path
          d="M-50,350 Q80,280 200,360 Q320,440 450,320 L550,800 L-50,800 Z"
          fill="hsl(40, 75%, 45%)"
          opacity="0.25"
        />
        <path
          d="M-50,500 Q100,440 250,520 Q400,600 550,480 L550,800 L-50,800 Z"
          fill="hsl(38, 70%, 42%)"
          opacity="0.2"
        />
      </svg>

      <img
        src={pengioLogo}
        alt="Pengio logo"
        className="w-80 h-auto relative z-10 animate-fade-in"
      />
    </div>
  );
};

export default Splash;
