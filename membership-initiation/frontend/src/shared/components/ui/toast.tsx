import React from "react";

type ToastType = "success" | "error" | "warning";

interface ToastProps {
  message: React.ReactNode;
  type?: ToastType;
}

const bgClass: Record<ToastType, string> = {
  success: "bg-emerald-500",
  error: "bg-red-500",
  warning: "bg-amber-500",
};

const Toast: React.FC<ToastProps> = ({ message, type = "success" }) => (
  <div
    className={`toast toast--${type} ${bgClass[type]} text-white rounded-xl text-sm px-6 py-4 my-4 shadow`}
  >
    {message}
  </div>
);

export default Toast;
