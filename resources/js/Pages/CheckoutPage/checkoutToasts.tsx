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

const optionsForType = (type: CheckoutToastType): ToastOptions => ({
  ...baseOptions,
  className: `checkout-toast checkout-toast--${type}`,
  bodyClassName: "checkout-toast-body",
  progressClassName: `checkout-toast-progress checkout-toast-progress--${type}`,
});

const iconForType: Record<CheckoutToastType, React.ReactNode> = {
  error: <FaExclamationCircle />,
  success: <FaCheckCircle />,
  info: <FaInfoCircle />,
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
