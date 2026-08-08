import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import logoNew from "@/assets/logo.png";

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    // Automatically redirect to user home after 3 seconds
    const timer = setTimeout(() => {
      navigate("/user");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-between bg-gradient-to-b from-[#fbf5f0] via-[#ffffff] to-[#fffaf5] px-6 py-12 overflow-hidden relative">
      {/* Decorative background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-[#ff9f1c]/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-[#7e3866]/10 to-transparent blur-[120px] pointer-events-none" />

      {/* Top spacing */}
      <div className="h-10" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* Glow behind the logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute w-72 h-72 rounded-full bg-[#ff9f1c]/5 blur-[60px]"
        />

        {/* Logo Animation */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 70,
            damping: 15,
            duration: 0.8,
          }}
          className="relative z-10 flex flex-col items-center gap-6"
        >
          <motion.img
            src={logoNew}
            alt="Tiffinji Logo"
            className="w-64 sm:w-80 h-auto object-contain drop-shadow-[0_10px_20px_rgba(255,159,28,0.12)]"
            animate={{
              scale: [1, 1.03, 1],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Subtitle / Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-gray-500 font-medium text-sm sm:text-base text-center tracking-wide max-w-xs"
          >
            Delicious home-style meals, delivered to your doorstep.
          </motion.p>
        </motion.div>
      </div>

      {/* Bottom Area - Skip */}
      <div className="flex flex-col items-center gap-8 z-10">
        {/* Skip button for quick manual entry */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          onClick={() => navigate("/user")}
          className="text-xs uppercase tracking-widest text-gray-400 hover:text-[#ff9f1c] font-semibold transition-colors duration-200 px-4 py-2"
        >
          Skip & Explore
        </motion.button>
      </div>
    </div>
  );
}
