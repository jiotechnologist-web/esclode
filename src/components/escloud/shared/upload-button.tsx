"use client";
import { useRef, forwardRef } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadButtonProps extends Omit<ButtonProps, "onClick"> {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
}

/**
 * Properly working upload button that opens the file picker.
 * Uses a hidden input + ref.click() pattern instead of label-wrapping
 * (which fails when a <button> is inside the <label>).
 */
export const UploadButton = forwardRef<HTMLButtonElement, UploadButtonProps>(
  ({ onFiles, accept, multiple = true, label = "Upload Files", icon, className, size = "default", variant = "default", ...props }, _ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {
      // Programmatically click the hidden input to open the file picker
      inputRef.current?.click();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        onFiles(files);
      }
      // Reset the input value so the same file can be selected again
      e.target.value = "";
    };

    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
          tabIndex={-1}
        />
        <Button
          type="button"
          onClick={handleClick}
          className={cn(className)}
          size={size}
          variant={variant}
          {...props}
        >
          {icon ?? <Upload className="w-4 h-4 mr-2" />}
          {label}
        </Button>
      </>
    );
  }
);

UploadButton.displayName = "UploadButton";
