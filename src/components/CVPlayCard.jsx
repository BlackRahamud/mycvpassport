import { motion } from "motion/react";
import { Briefcase, CheckCircle2, Sparkles } from "lucide-react";
import { useState } from "react";

export function CVPlayCard() {
  const [isHovered, setIsHovered] = useState(false);
  const [_activeSkill, setActiveSkill] = useState(null);

  const skills = [
    { name: "Banking", color: "bg-white text-black" },
    { name: "CRM", color: "bg-blue-600 text-white" },
    { name: "KYC", color: "bg-purple-600 text-white" },
    { name: "AML", color: "bg-amber-600 text-white" },
  ];

  const experiences = [
    {
      title: "Senior Banking Associate",
      company: "Emirates NBD",
      duration: "2022 - Present",
      color: "bg-blue-500",
    },
    {
      title: "Banking Associate",
      company: "Dubai Islamic Bank",
      duration: "2020 - 2022",
      color: "bg-purple-500",
    },
  ];

  return (
    <motion.div
      className="relative w-full max-w-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      {/* Card container with glass morphism */}
      <motion.div
        className="relative bg-gradient-to-br from-gray-900/90 to-gray-950/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-gray-800/50 overflow-hidden"
        animate={{
          boxShadow: isHovered
            ? "0 25px 50px -12px rgba(59, 130, 246, 0.25)"
            : "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: isHovered ? "100%" : "-100%" }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Top corner decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full" />

        {/* Available badge */}
        <motion.div
          className="absolute top-6 right-6 z-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          <div className="flex items-center gap-2 bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/50 text-emerald-400 px-4 py-2 rounded-full">
            <motion.div
              className="w-2 h-2 bg-emerald-400 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-sm">Available</span>
          </div>
        </motion.div>

        {/* Profile section */}
        <div className="relative flex flex-col items-center mb-8 mt-2">
          <motion.div className="relative mb-4">
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
              animate={{
                rotate: 360,
                scale: isHovered ? 1.05 : 1,
              }}
              transition={{
                rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                scale: { duration: 0.3 },
              }}
            />
            <div className="relative w-28 h-28 bg-gray-900 rounded-full flex items-center justify-center m-1">
              <span className="text-4xl text-white tracking-wider">JK</span>
            </div>
          </motion.div>

          <motion.h1
            className="text-3xl bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Junaid Khan
          </motion.h1>

          <motion.p
            className="text-gray-400 text-sm tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            BANKING ASSOCIATE · DUBAI, UAE
          </motion.p>
        </div>

        {/* Experience section */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs text-gray-500 tracking-widest uppercase">Experience</h2>
          </div>

          <div className="space-y-4">
            {experiences.map((exp, index) => (
              <motion.div
                key={index}
                className="group relative bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-gray-600 transition-all cursor-pointer overflow-hidden"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <motion.div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${exp.color}`}
                  initial={{ height: 0 }}
                  animate={{ height: "100%" }}
                  transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                />
                <div className="flex items-start gap-4">
                  <motion.div
                    className={`w-10 h-10 ${exp.color} rounded-lg flex items-center justify-center flex-shrink-0`}
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Briefcase className="w-5 h-5 text-white" />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white mb-1">{exp.title}</h3>
                    <p className="text-sm text-gray-400">{exp.company}</p>
                    <p className="text-xs text-gray-500 mt-1">{exp.duration}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Skills section */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h2 className="text-xs text-gray-500 tracking-widest uppercase">Skills</h2>
          </div>

          <div className="flex flex-wrap gap-3">
            {skills.map((skill, index) => (
              <motion.button
                key={skill.name}
                className={`${skill.color} px-5 py-2.5 rounded-full text-sm transition-all border-2 border-transparent relative overflow-hidden`}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + index * 0.1, type: "spring", stiffness: 200 }}
                whileHover={{ scale: 1.1, borderColor: "rgba(255, 255, 255, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                onHoverStart={() => setActiveSkill(skill.name)}
                onHoverEnd={() => setActiveSkill(null)}
              >
                {skill.name}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* CTA Button */}
        <motion.button
          className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-4 rounded-2xl shadow-lg shadow-emerald-500/30 relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          />
          <div className="relative flex items-center justify-center gap-3">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Share on WhatsApp — 90 sec</span>
          </div>
        </motion.button>
      </motion.div>

      {/* Bottom glow */}
      <motion.div
        className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 blur-2xl rounded-full"
        animate={{ opacity: isHovered ? 0.8 : 0.4, scaleX: isHovered ? 1.1 : 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}

export default CVPlayCard;
