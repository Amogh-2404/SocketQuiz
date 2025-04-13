'use client';

import React from 'react';
import { motion } from 'framer-motion';

type ButtonProps = {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
};

const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  variant = 'primary',
  disabled = false,
  className = '',
  fullWidth = false,
  type = 'button',
}) => {
  const baseClasses = 'py-3 px-6 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
  };
  
  const disabledClasses = 'opacity-50 cursor-not-allowed';
  const enabledClasses = 'cursor-pointer';
  const widthClass = fullWidth ? 'w-full' : '';
  
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? disabledClasses : enabledClasses} ${widthClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.button>
  );
};

export default Button; 