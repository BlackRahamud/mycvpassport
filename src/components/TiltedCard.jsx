import { useRef, useState } from "react";
import { motion } from "framer-motion";

const TiltedCard = ({ children, captionText, containerHeight = "380px", containerWidth = "100%", scaleOnHover = 1.04, rotateAmplitude = 8, displayOverlayContent = false, overlayContent = null }) => {
  const ref = useRef(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [scale, setScale] = useState(1);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    setRotateX(((e.clientY - rect.top - cy) / cy) * -rotateAmplitude);
    setRotateY(((e.clientX - rect.left - cx) / cx) * rotateAmplitude);
  };

  return (
    <div
      ref={ref}
      style={{ width: containerWidth, height: containerHeight, perspective: "800px", cursor: "pointer" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setScale(scaleOnHover)}
      onMouseLeave={() => { setRotateX(0); setRotateY(0); setScale(1); }}
    >
      <motion.div
        animate={{ rotateX, rotateY, scale }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #2a2a2a"
        }}
      >
        {children}
        {displayOverlayContent && overlayContent && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 16px", background: "linear-gradient(transparent, rgba(0,0,0,0.9))" }}>
            {overlayContent}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TiltedCard;
