import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number) => {
  return (amount).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
};

export function formatDateEST(date: Date | string | number) {
  return new Date(date).toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
}

export function formatDateTimeEST(date: Date | string | number) {
  return new Date(date).toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: true
  });
}
