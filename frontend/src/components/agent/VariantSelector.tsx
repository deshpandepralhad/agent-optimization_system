import React from 'react';
import clsx from 'clsx';

interface VariantSelectorProps {
  selected?: 'A' | 'B';
  onChange: (variant: 'A' | 'B') => void;
  disabled?: boolean;
}

export const VariantSelector: React.FC<VariantSelectorProps> = ({
  selected,
  onChange,
  disabled = false
}) => {
  return (
    <div className="flex space-x-4">
      <button
        onClick={() => onChange('A')}
        disabled={disabled}
        className={clsx(
          'flex-1 px-4 py-3 rounded-lg border-2 transition-all',
          selected === 'A'
            ? 'border-blue-600 bg-blue-50 text-blue-700'
            : 'border-gray-200 hover:border-blue-300 text-gray-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="font-semibold">Variant A</div>
        <div className="text-sm mt-1">Stable & Conservative</div>
      </button>
      
      <button
        onClick={() => onChange('B')}
        disabled={disabled}
        className={clsx(
          'flex-1 px-4 py-3 rounded-lg border-2 transition-all',
          selected === 'B'
            ? 'border-red-600 bg-red-50 text-red-700'
            : 'border-gray-200 hover:border-red-300 text-gray-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="font-semibold">Variant B</div>
        <div className="text-sm mt-1">Experimental & Faster</div>
      </button>
    </div>
  );
};