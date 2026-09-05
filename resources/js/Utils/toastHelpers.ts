import { toast } from "react-toastify";

export const showError = (message: string) => {
  toast.error(message || "Something went wrong", {
    position: "top-center",
    autoClose: 3000,
  });
};

export const showSuccess = (message: string) => {
  toast.success(message, {
    position: "top-center",
    autoClose: 3000,
  });
};
