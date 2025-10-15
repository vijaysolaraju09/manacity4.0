import type { ReactNode } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Controller, FormProvider, useFormContext, type ControllerFieldState, type ControllerRenderProps } from 'react-hook-form';
import type { HTMLAttributes, LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export { useForm } from 'react-hook-form';
export { FormProvider as Form };

export type FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  control: Control<TFieldValues>;
  name: TName;
  render: (props: {
    field: ControllerRenderProps<TFieldValues, TName>;
    fieldState: ControllerFieldState;
  }) => ReactNode;
};

export const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ control, name, render }: FormFieldProps<TFieldValues, TName>) => (
  <Controller control={control} name={name} render={({ field, fieldState }) => render({ field, fieldState })} />
);

export const FormItem = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('space-y-2', className)} {...props} />
);
FormItem.displayName = 'FormItem';

export const FormLabel = ({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn('text-sm font-medium text-slate-700 dark:text-slate-200', className)}
    {...props}
  />
);
FormLabel.displayName = 'FormLabel';

export const FormControl = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('space-y-2', className)} {...props} />
);
FormControl.displayName = 'FormControl';

export const FormDescription = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-slate-500 dark:text-slate-400', className)} {...props} />
);
FormDescription.displayName = 'FormDescription';

export const FormMessage = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-red-600 dark:text-red-400', className)} {...props} />
);
FormMessage.displayName = 'FormMessage';

export const useFormContextSafe = <TFieldValues extends FieldValues>() => {
  const context = useFormContext<TFieldValues>();
  if (!context) {
    throw new Error('useFormContextSafe must be used within a FormProvider');
  }
  return context;
};
