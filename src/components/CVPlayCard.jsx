import { motion } from "framer-motion";
import { Briefcase, CheckCircle2, Sparkles } from "lucide-react";
import { useState } from "react";

const SKILL_STYLES = {
  Banking: { background: "#fff", color: "#000" },
  CRM: { background: "#2563eb", color: "#fff" },
  KYC: { background: "#38bdf8", color: "#000" },
  AML: { background: "#d97706", color: "#fff" },
};

function CVPlayCard() {
  const [isHovered, setIsHovered] = useState(false);

  const skills = ["Banking", "CRM", "KYC", "AML"];

  const experiences = [
    {
      title: "Senior Banking Associate",
      company: "Emirates NBD",
      duration: "2022 - Present",
      accent: "#3b82f6",
    },
    {
      title: "Banking Associate",
      company: "Dubai Islamic Bank",
      duration: "2020 - 2022",
      accent: "#a855f7",
    },
  ];

  return (
    <motion.div
      style={{ position: "relative", width: "100%", maxWidth: "28rem" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <motion.div
        style={{
          position: "relative",
          overflow: "hidden",
          background: "#141414",
          border: "1px solid #2A2A2A",
          borderRadius: "16px",
          padding: "20px",
        }}
        animate={{
          boxShadow: isHovered
            ? "0 25px 50px -12px rgba(59, 130, 246, 0.25)"
            : "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
        }}
      >
        <motion.div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, transparent, rgba(255, 255, 255, 0.05), transparent)",
          }}
          initial={{ x: "-100%" }}
          animate={{ x: isHovered ? "100%" : "-100%" }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "8rem",
            height: "8rem",
            borderBottomLeftRadius: "9999px",
            background: "linear-gradient(to bottom right, rgba(59, 130, 246, 0.2), transparent)",
          }}
        />

        <motion.div
          style={{ position: "absolute", top: "1.5rem", right: "1.5rem", zIndex: 10 }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "9999px",
              background: "rgba(16, 185, 129, 0.2)",
              backdropFilter: "blur(4px)",
              border: "1px solid rgba(16, 185, 129, 0.5)",
              color: "#34d399",
            }}
          >
            <motion.div
              style={{
                width: "0.5rem",
                height: "0.5rem",
                borderRadius: "9999px",
                background: "#34d399",
              }}
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span style={{ fontSize: "0.875rem" }}>Available</span>
          </div>
        </motion.div>

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "2rem",
            marginTop: "0.5rem",
          }}
        >
          <motion.div style={{ position: "relative", marginBottom: "1rem" }}>
            <motion.div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "9999px",
                background: "linear-gradient(to right, #3b82f6, #a855f7)",
              }}
              animate={{
                rotate: 360,
                scale: isHovered ? 1.05 : 1,
              }}
              transition={{
                rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                scale: { duration: 0.3 },
              }}
            />
            <div
              style={{
                position: "relative",
                width: "7rem",
                height: "7rem",
                margin: "0.25rem",
                borderRadius: "9999px",
                background: "#111827",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: "2.25rem",
                  color: "#ffffff",
                  letterSpacing: "0.05em",
                }}
              >
                JK
              </span>
            </div>
          </motion.div>

          <motion.h1
            style={{
              fontSize: "1.875rem",
              marginBottom: "0.5rem",
              background: "linear-gradient(to right, #ffffff, #f3f4f6, #d1d5db)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Junaid Khan
          </motion.h1>

          <motion.p
            style={{
              color: "#9ca3af",
              fontSize: "0.875rem",
              letterSpacing: "0.025em",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            BANKING ASSOCIATE · DUBAI, UAE
          </motion.p>
        </div>

        <motion.div
          style={{ marginBottom: "2rem" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <Sparkles style={{ width: "1rem", height: "1rem", color: "#60a5fa" }} />
            <h2
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Experience
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {experiences.map((exp, index) => (
              <motion.div
                key={index}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: "0.75rem",
                  padding: "1rem",
                  cursor: "pointer",
                  background: "rgba(31, 41, 55, 0.5)",
                  backdropFilter: "blur(4px)",
                  border: "1px solid rgba(55, 65, 81, 0.5)",
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <motion.div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "0.25rem",
                    background: exp.accent,
                  }}
                  initial={{ height: 0 }}
                  animate={{ height: "100%" }}
                  transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                />
                <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                  <motion.div
                    style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "0.5rem",
                      background: exp.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Briefcase style={{ width: "1.25rem", height: "1.25rem", color: "#ffffff" }} />
                  </motion.div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ color: "#ffffff", marginBottom: "0.25rem" }}>{exp.title}</h3>
                    <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>{exp.company}</p>
                    <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                      {exp.duration}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          style={{ marginBottom: "2rem" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <Sparkles style={{ width: "1rem", height: "1rem", color: "#c084fc" }} />
            <h2
              style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Skills
            </h2>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {skills.map((name, index) => (
              <motion.button
                key={name}
                type="button"
                style={{
                  padding: "0.625rem 1.25rem",
                  borderRadius: "9999px",
                  fontSize: "0.875rem",
                  border: "2px solid transparent",
                  position: "relative",
                  overflow: "hidden",
                  background: SKILL_STYLES[name].background,
                  color: SKILL_STYLES[name].color,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + index * 0.1, type: "spring", stiffness: 200 }}
                whileHover={{ scale: 1.1, borderColor: "rgba(255, 255, 255, 0.3)" }}
                whileTap={{ scale: 0.95 }}
              >
                {name}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.button
          type="button"
          style={{
            width: "100%",
            position: "relative",
            overflow: "hidden",
            color: "#ffffff",
            padding: "1rem",
            borderRadius: "1rem",
            border: "none",
            cursor: "pointer",
            background: "linear-gradient(to right, #10b981, #059669)",
            boxShadow: "0 10px 15px -3px rgba(16, 185, 129, 0.3)",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2), transparent)",
            }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          />
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
            }}
          >
            <CheckCircle2 style={{ width: "1.25rem", height: "1.25rem" }} />
            <span style={{ fontWeight: 500 }}>Share on WhatsApp — 90 sec</span>
          </div>
        </motion.button>
      </motion.div>

      <motion.div
        style={{
          position: "absolute",
          bottom: "-2rem",
          left: "50%",
          width: "75%",
          height: "2rem",
          borderRadius: "9999px",
          background:
            "linear-gradient(to right, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2), rgba(59, 130, 246, 0.2))",
          filter: "blur(24px)",
        }}
        initial={{ x: "-50%" }}
        animate={{
          x: "-50%",
          opacity: isHovered ? 0.8 : 0.4,
          scaleX: isHovered ? 1.1 : 1,
        }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}

export default CVPlayCard;
