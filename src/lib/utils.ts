import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to generate IDs
export const generateId = (): string => {
  return `template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};
