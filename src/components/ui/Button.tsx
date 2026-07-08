import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
  children: ReactNode;
}

const styles = {
  primary:
    'bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none',
  secondary:
    'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 active:scale-[0.98] disabled:text-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 active:scale-[0.98]',
};

export default function Button({ variant = 'primary', fullWidth, children, className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`rounded-2xl px-5 py-3.5 font-semibold text-base transition-all ${styles[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
