'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
  idPrefix: string;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

const useTabsContext = (component: string) => {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error(`${component} must be used within <Tabs>`);
  }
  return context;
};

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ value: controlledValue, defaultValue, onValueChange, className, children, ...props }, ref) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? '');
    const value = controlledValue ?? uncontrolledValue;
    const idPrefix = React.useId();

    const handleChange = React.useCallback(
      (next: string) => {
        if (!controlledValue) {
          setUncontrolledValue(next);
        }
        onValueChange?.(next);
      },
      [controlledValue, onValueChange],
    );

    const contextValue = React.useMemo(
      () => ({ value, onValueChange: handleChange, idPrefix }),
      [value, handleChange, idPrefix],
    );

    React.useEffect(() => {
      if (!value && defaultValue) {
        handleChange(defaultValue);
      }
    }, [defaultValue, handleChange, value]);

    return (
      <TabsContext.Provider value={contextValue}>
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = 'Tabs';

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="tablist"
        className={cn(
          'inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200/70 bg-white/80 p-1 text-slate-500 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
          className,
        )}
        {...props}
      />
    );
  },
);
TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, disabled, onClick, ...props }, ref) => {
    const { value: activeValue, onValueChange, idPrefix } = useTabsContext('TabsTrigger');
    const isActive = activeValue === value;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        id={`${idPrefix}-trigger-${value}`}
        aria-selected={isActive}
        aria-controls={`${idPrefix}-content-${value}`}
        data-state={isActive ? 'active' : 'inactive'}
        disabled={disabled}
        onClick={(event) => {
          onClick?.(event);
          if (!disabled) {
            onValueChange(value);
          }
        }}
        className={cn(
          'inline-flex min-w-[7rem] items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border data-[state=active]:border-slate-200 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm dark:data-[state=active]:border-slate-700 dark:data-[state=active]:text-white',
          className,
        )}
        {...props}
      />
    );
  },
);
TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  forceMount?: boolean;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, forceMount, ...props }, ref) => {
    const { value: activeValue, idPrefix } = useTabsContext('TabsContent');
    const isActive = activeValue === value;

    if (!forceMount && !isActive) {
      return null;
    }

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`${idPrefix}-content-${value}`}
        aria-labelledby={`${idPrefix}-trigger-${value}`}
        data-state={isActive ? 'active' : 'inactive'}
        hidden={!isActive}
        className={cn(!isActive && 'hidden', className)}
        {...props}
      />
    );
  },
);
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsContent, TabsList, TabsTrigger };
