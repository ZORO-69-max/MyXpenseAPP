import { useEffect, useRef } from 'react';

const ParticleBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const createParticle = () => {
      if (!containerRef.current) return;

      const particle = document.createElement('div');
      particle.className = 'particle';

      const size = Math.random() * 8 + 4;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${Math.random() * 100}%`;

      const duration = Math.random() * 10 + 10;
      particle.style.animationDuration = `${duration}s`;
      particle.style.animationDelay = `${Math.random() * 5}s`;

      containerRef.current.appendChild(particle);

      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, (duration + 5) * 1000);
    };

    const interval = setInterval(createParticle, 800);

    for (let i = 0; i < 15; i++) {
      setTimeout(createParticle, i * 200);
    }

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div ref={containerRef} className="particles fixed top-0 left-0 w-full h-full overflow-hidden z-0">
      <style>{`
        .particle {
          position: absolute;
          background: linear-gradient(45deg, #3b82f6, #8b5cf6, #06b6d4);
          border-radius: 50%;
          animation: float 15s infinite linear;
          opacity: 0.6;
        }
        
        @keyframes float {
          0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ParticleBackground;
