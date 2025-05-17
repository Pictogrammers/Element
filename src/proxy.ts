export const addObserver: unique symbol = Symbol('addCallback');
export const removeObserver: unique symbol = Symbol('removeCallback');

type AddObserverCallback = (key?: string) => void;
type AddObserver = (host: HTMLElement, callback: AddObserverCallback) => void;
type RemoveObserver = (host: HTMLElement) => void;

const arrayRender = ['fill', 'pop', 'push', 'reverse', 'shift', 'slice', 'sort', 'splice', 'unshift', 'with'];
const arrayRead = ['forEach', 'map'];

// key = obj, value = Map<ele, callback[]>
const observers = new Map();

type IsAny<T> = unknown extends T & string ? true : false;

type ExtrasArray<T> = {
  push(...items: T & object[]): number;
  fill(
    value: T extends (infer U)[] ? U : object,
    start?: number,
    end?: number
  ): void;
  [addObserver]: AddObserver;
  [removeObserver]: RemoveObserver;
};

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

/*

{
  //get<K extends string>(key: K): RecursiveProxy<any>;
  push(...items: T & object[]): number;
  fill(
    value: T extends (infer U)[] ? U : object,
    start?: number,
    end?: number
  ): void;
  [addObserver]: AddObserver;
  [removeObserver]: RemoveObserver;
} & 
 */

let trigger: any = null;

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
        throw new Error('test');
      }
      if (prop in target) {
        if (!Number.isNaN(Number(prop))) {
          console.log(prop, 'array!!!');
          return createProxy(target);
        }
        if (arrayRender.includes(prop)) {
          if (observers.has(target)) {
            trigger = prop;
          }
        }
        return target[prop];
      }
      console.log(prop, '+++');
      return createProxy(target);
    },
    set(target: any, prop: string | symbol, value): boolean {
      if (typeof prop === 'symbol') {
        throw new Error('Setting symbols not allowed.');
      }
      console.log(Array.isArray(target), prop, target);
      if (Array.isArray(target)) {
        console.log(trigger, prop, '<---');
        if ((trigger === 'push' && prop === 'length')
          || (trigger === 'pop' && prop === 'length')) {
          const map = observers.get(target);
          map.forEach((callbacks: any, host: HTMLElement) => {
            callbacks.forEach((callback: any) =>  {
              callback();
            });
          });
          console.log(prop, 'SET Array!');
        }
      } else {
        if (observers.has(target)) {
          const map = observers.get(target);
          map.forEach((callbacks: any, host: HTMLElement) => {
            callbacks.forEach((callback: any) =>  {
              callback(prop, value);
            });
          });
        }
        console.log(prop, 'SET Object!');
      }
      Reflect.set(target, prop, value);
      return true;
    }
  });
}
