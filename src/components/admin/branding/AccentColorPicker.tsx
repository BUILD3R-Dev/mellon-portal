import * as React from 'react';

interface AccentColorPickerProps {
  value: string | null;
  onChange: (color: string | null) => void;
  defaultColor: string;
}

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export function AccentColorPicker({ value, onChange, defaultColor }: AccentColorPickerProps) {
  const [inputValue, setInputValue] = React.useState(value || '');
  const [error, setError] = React.useState<string | null>(null);

  // Update input when value prop changes
  React.useEffect(() => {
    setInputValue(value || '');
    setError(null);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;

    // Auto-add # prefix if typing a hex color
    if (newValue && !newValue.startsWith('#')) {
      newValue = '#' + newValue;
    }

    setInputValue(newValue);
    setError(null);

    // Validate and update if complete
    if (newValue === '' || newValue === '#') {
      // Empty is valid (will use default)
      return;
    }

    if (HEX_COLOR_REGEX.test(newValue)) {
      onChange(newValue.toUpperCase());
    }
  };

  const handleInputBlur = () => {
    if (inputValue === '' || inputValue === '#') {
      // Clear to use default
      onChange(null);
      setInputValue('');
      return;
    }

    if (!HEX_COLOR_REGEX.test(inputValue)) {
      setError('Please enter a valid hex color (e.g., #FF5733)');
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value.toUpperCase();
    setInputValue(newColor);
    setError(null);
    onChange(newColor);
  };

  const handleReset = () => {
    setInputValue('');
    setError(null);
    onChange(null);
  };

  const displayColor = value || defaultColor;

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">Accent Color</label>
      <p className="text-sm text-gray-500">
        Customize the accent color for buttons, links, and highlights. Leave empty to use the theme default.
      </p>

      <div className="flex items-start gap-4">
        {/* Color preview swatch */}
        <div className="flex-shrink-0">
          <div
            className="w-12 h-12 rounded-lg border border-gray-300 shadow-inner"
            style={{ backgroundColor: displayColor }}
          />
          <p className="mt-1 text-xs text-center text-gray-500">
            {value ? 'Custom' : 'Default'}
          </p>
        </div>

        {/* Color input controls */}
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            {/* Hex input */}
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  placeholder={defaultColor}
                  maxLength={7}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all font-mono ${
                    error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
              </div>
            </div>

            {/* Native color picker */}
            <div className="relative">
              <input
                type="color"
                value={displayColor}
                onChange={handleColorPickerChange}
                className="w-12 h-11 p-0 border border-gray-300 rounded-lg cursor-pointer"
                title="Pick a color"
              />
            </div>
          </div>

          {/* Error message */}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Reset button */}
          {value && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Reset to theme default ({defaultColor})
            </button>
          )}
        </div>
      </div>

      {/* Preset colors */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Quick select:</p>
        <div className="flex flex-wrap gap-2">
          {['#2563EB', '#DC2626', '#059669', '#7C3AED', '#EA580C', '#0891B2'].map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => {
                setInputValue(color);
                setError(null);
                onChange(color);
              }}
              className={`w-8 h-8 rounded-lg border-2 transition-all ${
                value === color ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-1' : 'border-gray-200 hover:border-gray-400'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
