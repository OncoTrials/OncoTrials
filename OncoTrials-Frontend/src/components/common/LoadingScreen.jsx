// components/AuthLoadingScreen.jsx
import { motion } from "framer-motion";

export default function LoadingScreen({ message }) {
    return (
        <motion.div
            className="flex items-center justify-center min-h-screen bg-gray-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="flex flex-col items-center gap-4">
                {/* Pulsing circle */}
                <motion.div
                    className="w-12 h-12 rounded-full bg-blue-600"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.6, 1, 0.6]
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* Dots appearing one by one */}
                <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                        <motion.span
                            key={i}
                            className="w-2 h-2 bg-blue-600 rounded-full"
                            animate={{
                                opacity: [0.3, 1, 0.3]
                            }}
                            transition={{
                                delay: i * 0.2,
                                duration: 1,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        />
                    ))}
                </div>

                {/* Status text */}
                <motion.p
                    className="text-gray-600 text-sm font-medium tracking-wide"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    {message}
                </motion.p>
            </div>
        </motion.div>
    );
}
