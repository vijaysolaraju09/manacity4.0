declare module '@playwright/test' {
  export interface Page {
    goto(url: string): Promise<void>;
    setViewportSize(size: { width: number; height: number }): Promise<void>;
    waitForTimeout(timeout: number): Promise<void>;
  }

  export interface Locator {
    click(options?: Record<string, unknown>): Promise<void>;
    isVisible(): Promise<boolean>;
    innerText(): Promise<string>;
  }

  export interface BrowserContext {}

  export interface TestInfo {
    skip(condition: boolean, description?: string): void;
  }

  export type TestFunction = (args: { page: Page }, testInfo: TestInfo) => Promise<void> | void;

  export function test(name: string, fn: TestFunction): void;
  export function describe(name: string, fn: () => void): void;
  export function expect(value: unknown): { toBeTruthy(): void; toContain(text: string): void };
}
