import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  onClick,
  className = "",
  type = "button",
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition duration-200";

  const variantStyles = {
    primary: "bg-[#029bba] text-white hover:bg-[#027a94]",
    secondary: "bg-[#004063] text-white hover:bg-[#003050]",
    outline:
      "border-2 border-[#029bba] text-[#029bba] hover:bg-[#029bba] hover:text-white",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
  };

  const sizeStyles = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const disabledStyles = disabled || loading
    ? "opacity-50 cursor-not-allowed"
    : "hover:shadow-md active:scale-[0.98]";

  const finalClass = `
    ${baseStyles}
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${disabledStyles}
    ${className}
  `.trim();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={finalClass}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin w-5 h-5 mr-2" />
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
};
