import React from 'react';
import { motion } from 'motion/react';

interface PageTransitionProps {
    children: React.ReactNode;
    className?: string; // Allow passing standard classNames
}

const PageTransition = ({ children, className = "" }: PageTransitionProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`w-full h-full ${className}`} // Merge className
        >
            {children}
        </motion.div>
    );
};

export default PageTransition;
