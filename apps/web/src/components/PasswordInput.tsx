import { useState } from "react";
import { Icon } from "./Icon";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function PasswordInput({ value, onChange, placeholder, required }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className="input pr-11"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-on-surface-variant hover:text-on-surface"
        title={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
      >
        <Icon name={visible ? "visibility_off" : "visibility"} className="text-[20px]" />
      </button>
    </div>
  );
}
