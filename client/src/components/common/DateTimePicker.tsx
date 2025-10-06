import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';

interface DateTimePickerProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'className'> {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
  inputClassName?: string;
}

const DateTimePicker = forwardRef<HTMLInputElement, DateTimePickerProps>(
  (
    {
      id: providedId,
      label,
      value,
      onChange,
      error,
      className,
      inputClassName,
      required,
      disabled,
      onBlur,
      onFocus,
      min,
      max,
      ...rest
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = providedId ?? `${generatedId}-datetime`;
    const errorId = error ? `${inputId}-error` : undefined;
    const wrapperClassName = ['form-field', className].filter(Boolean).join(' ');

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const { currentTarget } = event;
      onChange(currentTarget.value);
      setTimeout(() => {
        if (typeof document !== 'undefined' && document.activeElement === currentTarget) {
          currentTarget.blur();
        }
      }, 0);
    };

    return (
      <div className={wrapperClassName}>
        <label htmlFor={inputId}>{label}</label>
        <input
          ref={ref}
          id={inputId}
          type="datetime-local"
          value={value ?? ''}
          onChange={handleChange}
          onBlur={onBlur}
          onFocus={onFocus}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          required={required}
          disabled={disabled}
          min={min}
          max={max}
          className={inputClassName}
          {...rest}
        />
        {error ? (
          <p id={errorId} className="field-error">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);

DateTimePicker.displayName = 'DateTimePicker';

export default DateTimePicker;
