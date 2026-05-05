import { motion, useReducedMotion } from "framer-motion";

export default function PostJobPreview({ title = "Build your talent search" }) {
  const reduce = useReducedMotion();
  return (
    <div className="pj-preview">
      <motion.div
        className="pj-preview__card"
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={
          reduce
            ? { opacity: 1, y: 0 }
            : { opacity: 1, y: [0, -3, 0] }
        }
        transition={
          reduce
            ? { duration: 0.4 }
            : {
                opacity: { duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: 0.15 },
                y: {
                  duration: 6,
                  ease: [0.4, 0, 0.2, 1],
                  repeat: Infinity,
                  repeatType: "loop",
                  delay: 0.6,
                },
              }
        }
      >
        <h3 className="pj-preview__title">{title}</h3>
      </motion.div>
    </div>
  );
}
