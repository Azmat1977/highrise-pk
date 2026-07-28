import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingWhatsAppProps {
  propertyTitle?: string;
  projectName?: string;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({
  propertyTitle,
  projectName,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const phoneNumber = '923001234567'; // Apna WhatsApp number yahan daalein

  // Smart message based on current page
  useEffect(() => {
    const path = router.pathname;
    
    if (propertyTitle) {
      // Property detail page
      setMessage(`Assalam-u-Alaikum! Mujhe "${propertyTitle}" property ke baare mein maloomat chahiye. Kya aap details share kar sakte hain?`);
    } else if (projectName) {
      // Project detail page
      setMessage(`Assalam-u-Alaikum! Mujhe "${projectName}" project ki details chahiye. Price list aur brochure bhi bhej dein please.`);
    } else if (path.includes('/properties')) {
      // Properties listing page
      setMessage('Assalam-u-Alaikum! Mujhe properties dekhni hain. Kya aap guide kar sakte hain?');
    } else if (path.includes('/projects')) {
      // Projects listing page
      setMessage('Assalam-u-Alaikum! Mujhe new projects ke baare mein info chahiye.');
    } else if (path.includes('/developers')) {
      // Developers page
      setMessage('Assalam-u-Alaikum! Mujhe verified developers ki list chahiye.');
    } else if (path.includes('/contact')) {
      // Contact page
      setMessage('Assalam-u-Alaikum! Mujhe Highrise.pk team se baat karni hai.');
    } else {
      // Default - Home page or any other
      setMessage('Assalam-u-Alaikum! Mujhe Highrise.pk par property ke baare mein maloomat chahiye.');
    }
  }, [router.pathname, propertyTitle, projectName]);

  const handleClick = () => {
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed bottom-24 right-6 z-50">
      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap"
          >
            WhatsApp par baat karein
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full border-8 border-transparent border-l-gray-900" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp Button */}
      <motion.button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="relative bg-[#25D366] hover:bg-[#20bd5a] text-white p-4 rounded-full shadow-lg shadow-green-500/30 transition-colors"
        aria-label="Chat on WhatsApp"
      >
        {/* WhatsApp Icon */}
        <svg
          className="w-6 h-6"
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>

        {/* Pulse Animation */}
        <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
      </motion.button>
    </div>
  );
};

export default FloatingWhatsApp;
