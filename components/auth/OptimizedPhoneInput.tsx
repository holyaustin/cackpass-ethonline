'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { Value as PhoneNumberValue } from 'react-phone-number-input';

// Lazy load the phone input component - only loads when user focuses
const LazyPhoneInput = dynamic(
  () => import('react-phone-number-input').then(mod => mod.default),
  {
    loading: () => (
      <div className="flex items-center w-full">
        <div className="animate-pulse flex-1 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg" />
      </div>
    ),
    ssr: false,
  }
) as React.ComponentType<any>;

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  className?: string;
  placeholder?: string;
  international?: boolean;
  defaultCountry?: string;
  inputComponent?: React.ComponentType<any>;
  numberInputProps?: Record<string, any>;
  style?: React.CSSProperties;
}

export const PhoneInput = ({
  value,
  onChange,
  className,
  placeholder,
  international = true,
  defaultCountry = 'NG',
  inputComponent,
  numberInputProps,
  style,
}: PhoneInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    // Preload after 500ms of idle time
    setTimeout(() => setHasLoaded(true), 500);
  };

  const handleChange = (val: PhoneNumberValue) => {
    onChange?.(val || undefined);
  };

  // Show simple input initially for better perceived performance
  if (!isFocused && !hasLoaded) {
    return (
      <div className={className}>
        <input
          type="tel"
          placeholder={placeholder || "Phone number"}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={handleFocus}
          className="w-full h-full bg-transparent px-3 text-sm font-medium outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
        />
      </div>
    );
  }

  return (
    <LazyPhoneInput
      international={international}
      defaultCountry={defaultCountry}
      value={value}
      onChange={handleChange}
      className={className}
      inputComponent={inputComponent}
      numberInputProps={numberInputProps}
      style={style}
    />
  );
};