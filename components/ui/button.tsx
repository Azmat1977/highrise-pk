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
    "inline-flex min-h-11 items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

  const variantStyles = {
    primary: "bg-primary text-white hover:bg-primaryDark shadow-sm hover:shadow-md",
    secondary: "bg-secondary text-white hover:bg-secondary/90 shadow-sm hover:shadow-md",
    outline:
      "border-2 border-primary text-primary hover:bg-primary hover:text-white",
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
