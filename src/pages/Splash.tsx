import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import pengioLogo from "@/assets/pengio-logo.png";
import { useAuth } from "@/context/AuthContext";

/** Long enough to read the logo, short enough not to be in the way. */
const SPLASH_MS = 1200;

const Splash = () => {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  // The session was always being restored from storage; this screen just sent
  // everyone to /login regardless, so signing in looked like something the app
  // demanded every time. Restoring is asynchronous, so the decision waits for
  // it -- otherwise a signed-in user is sent to /login a moment before their
  // session arrives.
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      navigate(session ? "/home" : "/login", { replace: true });
    }, SPLASH_MS);
    return () => clearTimeout(timer);
  }, [navigate, session, loading]);

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
