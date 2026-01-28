declare module 'lodash.throttle' {
  interface ThrottleSettings {
    leading?: boolean;
    trailing?: boolean;
  }

  interface DebouncedFunc<T extends (...args: any[]) => any> {
    (...args: Parameters<T>): ReturnType<T> | undefined;
    cancel(): void;
    flush(): ReturnType<T> | undefined;
  }

  function throttle<T extends (...args: any[]) => any>(
    func: T,
    wait?: number,
    options?: ThrottleSettings
  ): DebouncedFunc<T>;

  export = throttle;
}
