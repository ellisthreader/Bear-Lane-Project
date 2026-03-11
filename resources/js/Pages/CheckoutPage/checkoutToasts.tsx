import React from "react";
import { toast, type ToastOptions } from "react-toastify";
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle } from "react-icons/fa";

type CheckoutToastType = "error" | "success" | "info";

const baseOptions: ToastOptions = {
  position: "bottom-right",
  autoClose: 3500,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  pauseOnFocusLoss: false,
  draggable: false,
};

const optionsForType = (type: CheckoutToastType): ToastOptions => {
  const progressClass =
    type === "error"
      ? "bg-red-500"
      : type === "success"
        ? "bg-green-500"
        : "bg-blue-500";

  return {
    ...baseOptions,
    className:
      "min-h-[68px] rounded-[14px] border border-gray-200 bg-white px-4 py-3 text-gray-900 shadow-[0_12px_30px_rgba(17,24,39,0.12)]",
    bodyClassName: "m-0 p-0",
    progressClassName: `h-[3px] ${progressClass}`,
  };
};

const iconForType: Record<CheckoutToastType, React.ReactNode> = {
  error: <FaExclamationCircle className="text-gray-700" />,
  success: <FaCheckCircle className="text-gray-700" />,
  info: <FaInfoCircle className="text-gray-700" />,
};

export const showCheckoutError = (message: string) =>
  toast.error(message, {
    ...optionsForType("error"),
    icon: iconForType.error,
  });

export const showCheckoutSuccess = (message: string) =>
  toast.success(message, {
    ...optionsForType("success"),
    icon: iconForType.success,
  });

export const showCheckoutInfo = (message: string) =>
  toast.info(message, {
    ...optionsForType("info"),
    icon: iconForType.info,
  });
