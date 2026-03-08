declare module 'framer-motion' {
  import { ReactNode, HTMLAttributes } from 'react';

  export interface MotionProps extends HTMLAttributes<HTMLElement> {
    initial?: any;
    animate?: any;
    exit?: any;
    whileHover?: any;
    whileTap?: any;
    whileFocus?: any;
    whileInView?: any;
    transition?: any;
    variants?: any;
    custom?: any;
    style?: any;
    className?: string;
    children?: ReactNode;
    viewport?: any;
    [key: string]: any;
  }

  type MotionComponent = (props: MotionProps) => JSX.Element;

  export const motion: {
    [key: string]: MotionComponent;
    button: MotionComponent;
    div: MotionComponent;
    span: MotionComponent;
    a: MotionComponent;
    img: MotionComponent;
    section: MotionComponent;
    article: MotionComponent;
    header: MotionComponent;
    footer: MotionComponent;
    nav: MotionComponent;
    main: MotionComponent;
    aside: MotionComponent;
    h1: MotionComponent;
    h2: MotionComponent;
    h3: MotionComponent;
    h4: MotionComponent;
    h5: MotionComponent;
    h6: MotionComponent;
    p: MotionComponent;
    ul: MotionComponent;
    ol: MotionComponent;
    li: MotionComponent;
  };

  export interface AnimatePresenceProps {
    children?: ReactNode;
    initial?: boolean;
    mode?: 'wait' | 'sync' | 'popLayout';
    [key: string]: any;
  }

  export function AnimatePresence(props: AnimatePresenceProps): JSX.Element;

  export interface MotionProps {
    [key: string]: any;
  }

  // Motion values and hooks
  export class MotionValue<T = any> {
    get(): T;
    set(v: T): void;
    [key: string]: any;
  }

  export function useMotionValue<T>(initial: T): MotionValue<T>;
  export function useTransform<T, U>(
    value: MotionValue<T> | T,
    input: number[],
    output: U[],
    options?: any
  ): MotionValue<U>;
  export function useSpring(source: MotionValue, config?: any): MotionValue;
  export function useMotionTemplate(strings: TemplateStringsArray, ...values: any[]): MotionValue<string>;
  export function useScroll(options?: any): {
    scrollX: MotionValue<number>;
    scrollY: MotionValue<number>;
    scrollXProgress: MotionValue<number>;
    scrollYProgress: MotionValue<number>;
  };
  export function useInView(ref: any, options?: any): boolean;
}
