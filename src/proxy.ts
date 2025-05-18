export const addObserver: unique symbol = Symbol('addCallback');
export const removeObserver: unique symbol = Symbol('removeCallback');

type AddObserverCallback = (key?: string) => void;
type AddObserver = (host: HTMLElement, callback: AddObserverCallback) => void;
type RemoveObserver = (host: HTMLElement) => void;

const arrayRender = ['fill', 'pop', 'push', 'reverse', 'shift', 'slice', 'sort', 'splice', 'unshift', 'with'];
const arrayRead = ['forEach', 'some', 'map', 'indexOf', 'lastIndexOf'];

// key = obj, value = Map<ele, callback[]>
const observers = new Map();

type IsAny<T> = unknown extends T & string ? true : false;

type ExtrasArray<T> = {
  [addObserver]: AddObserver;
  [removeObserver]: RemoveObserver;
} & Array<T extends (infer U)[] ? Partial<U> : object>;

type Extras = {
  [addObserver]: AddObserver;
  [removeObserver]: RemoveObserver;
};

// Short-circuit any or this is infinite
type RecursiveProxy<T> = IsAny<T> extends true
? any 
: T extends Array<any>
  ? ExtrasArray<T> & {
    [P in keyof T]: IsAny<T[P]> extends true ? any : RecursiveProxy<T[P]>
  }
  : {
    [P in keyof T]: IsAny<T[P]> extends true
    ? any
    : T[P] extends Array<any>
      ? RecursiveProxy<T[P]>
      : T[P]
  } & Extras;

export function createProxy<T>(obj: T): RecursiveProxy<T> {
  return new Proxy(obj as any, {
    get(target: any, prop: string | symbol): any {
      if (typeof prop === 'symbol') {
        if (prop === addObserver) {
          return (host: HTMLElement, callback: AddObserverCallback) => {
            if (observers.has(target)) {
              if (observers.get(target).has(host)) {
                observers.get(target).get(host).push(callback);
              } else {
                observers.get(target).set(host, [callback]);
              }
            } else {
              observers.set(target, new Map([[host, [callback]]]));
            }
          };
        }
        if (prop === removeObserver) {
          return (host: HTMLElement) => {
            if (observers.has(target)) {
              observers.get(target).delete(host);
              if (observers.get(target).size === 0) {
                observers.delete(target);
              }
            }
          };
        }
        if (prop === Symbol.toPrimitive || Symbol.toStringTag) {
          return Reflect.get(target, prop);
        }
        throw new Error('Unsupported symbol');
      }
      if (prop in target) {
        if (!Number.isNaN(Number(prop))) {
          return createProxy(target[prop]);
        }
        if (arrayRender.includes(prop)) {
          if (observers.has(target)) {
            return () => {
              const result = Array.prototype[prop as any].apply(target, arguments);
              const map = observers.get(target);
              map.forEach((callbacks: any, host: HTMLElement) => {
                callbacks.forEach((callback: any) =>  {
                  callback();
                });
              });
              return result;
            }
          }
        }
        return Reflect.get(target, prop);
      }
      console.log(prop, '+++');
      return createProxy(target);
    },
    set(target: any, prop: string | symbol, value): boolean {
      if (typeof prop === 'symbol') {
        throw new Error('Setting symbols not allowed.');
      }
      if (Array.isArray(target)) {
        console.log('array already handled');
        return Reflect.set(target, prop, value);
      }
      if (observers.has(target)) {
        const map = observers.get(target);
        map.forEach((callbacks: any, host: HTMLElement) => {
          callbacks.forEach((callback: any) =>  {
            callback(prop, value);
          });
        });
      }
      return Reflect.set(target, prop, value);
    }
  });
}
