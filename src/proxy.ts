export const addObserver: unique symbol = Symbol('addObserver');
export const removeObserver: unique symbol = Symbol('removeObserver');
export const hasObserver: unique symbol = Symbol('getObservers');

type AddObserverCallback = (key?: string) => void;
type AddObserver = (host: HTMLElement, callback: AddObserverCallback) => void;
type RemoveObserver = (host: HTMLElement) => void;

const arrayMutate = ['fill', 'pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'];
const arrayRead = ['forEach', 'slice', 'some', 'map', 'indexOf', 'lastIndexOf', 'width'];

// key = obj, value = Map<ele, callback[]>
const observers = new Map();
//@ts-ignore
window.observers = observers;

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
        if (prop === hasObserver) {
          return observers.has(obj);
        }
        if (prop === addObserver) {
          return (host: HTMLElement, callback: AddObserverCallback) => {
            if (observers.has(obj)) {
              if (observers.get(obj).has(host)) {
                observers.get(obj).get(host).push(callback);
              } else {
                observers.get(obj).set(host, [callback]);
              }
            } else {
              observers.set(obj, new Map([[host, [callback]]]));
            }
          };
        }
        if (prop === removeObserver) {
          return (host: HTMLElement) => {
            if (observers.has(obj)) {
              observers.get(obj).delete(host);
              if (observers.get(obj).size === 0) {
                observers.delete(obj);
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
          if (typeof target[prop] === 'object') {
            return createProxy(target[prop]);
          }
          return target[prop];
        }
        if (prop === 'copyWithin') {
          throw new Error('Unsupported array method copyWithin');
        }
        if (arrayMutate.includes(prop)) {
          if (observers.has(target)) {
            return function() {
              const result = Array.prototype[prop as any].apply(target, arguments);
              const map = observers.get(target);
              map.forEach((callbacks: any, host: HTMLElement) => {
                callbacks.forEach((callback: any) =>  {
                  callback(target, prop, arguments);
                });
              });
              return result;
            }
          }
          return Reflect.get(target, prop);
        }
        if (target[prop] instanceof Array) {
          return createProxy(target[prop]);
        }
        // nested objects do not get proxied for perf
      }
      return Reflect.get(target, prop);
    },
    set(target: any, prop: string | symbol, value): boolean {
      if (typeof prop === 'symbol') {
        throw new Error('Setting symbols not allowed.');
      }
      if (Array.isArray(target)) {
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

export const Mutation = {
  fill: 'fill',
  pop: 'pop',
  push: 'push',
  reverse: 'reverse',
  shift: 'shift',
  sort: 'sort',
  splice: 'splice',
  unshift: 'unshift'
};
