/**
 * Sample package for testing npm-llms
 * @module sample-package
 */

/**
 * Add two numbers together
 * @param a - First number
 * @param b - Second number
 * @returns The sum of a and b
 * @example
 * ```ts
 * add(1, 2) // returns 3
 * ```
 */
export declare function add(a: number, b: number): number;

/**
 * Subtract two numbers
 * @param a - First number
 * @param b - Second number
 * @returns The difference of a and b
 */
export declare function subtract(a: number, b: number): number;

/**
 * Multiply numbers
 * @param numbers - Numbers to multiply
 * @returns The product
 * @since 1.0.0
 */
export declare function multiply(...numbers: number[]): number;

/**
 * Configuration options
 */
export interface Config {
  /** Enable debug mode */
  debug?: boolean;
  /** Output format */
  format: 'json' | 'text';
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Result of an operation
 */
export interface Result<T> {
  /** Whether the operation succeeded */
  success: boolean;
  /** The data if successful */
  data?: T;
  /** Error message if failed */
  error?: string;
}

/**
 * Calculator class for math operations
 * @example
 * ```ts
 * const calc = new Calculator();
 * calc.add(1, 2); // 3
 * ```
 */
export declare class Calculator {
  /** Current value */
  value: number;

  /**
   * Create a new calculator
   * @param initial - Initial value
   */
  constructor(initial?: number);

  /**
   * Add a number to the current value
   * @param n - Number to add
   * @returns The calculator instance
   */
  add(n: number): this;

  /**
   * Reset the calculator
   */
  reset(): void;

  /**
   * Get the current value
   * @returns Current value
   */
  getValue(): number;
}

/**
 * Operation type
 */
export type Operation = 'add' | 'subtract' | 'multiply' | 'divide';

/**
 * Numeric value or expression
 */
export type NumericValue = number | string | { value: number };

/**
 * Log levels
 */
export declare enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Default configuration
 */
export declare const DEFAULT_CONFIG: Config;

/**
 * Package version
 */
export declare const VERSION: string;

/**
 * @deprecated Use add() instead
 */
export declare function sum(a: number, b: number): number;
