import './global';
import {
  Mutation,
  createProxy,
  addObserver,
  removeObserver,
  hasObserver,
  isProxy,
  getTarget
} from './proxy';

interface CustomElementConfig {
  selector?: string;
  template?: string;
  style?: CSSStyleSheet;
  useShadow?: boolean;
}

interface Constructor {
  symbols: object,
  observedAttributes: string[]
}

class PropError extends Error {
  constructor(message: string, ignore: any) {
    super(message);
    this.name = 'PropError';

    // @ts-ignore
    if (Error.captureStackTrace) {
      // @ts-ignore
      Error.captureStackTrace(this, ignore);
    }
  }
}

export const index = Symbol('index');
const init = Symbol('init');
const template = Symbol('template');
const style = Symbol('style');
const parent = Symbol('parent');

export function getProxyValue(obj: any) {
  return obj[isProxy] && obj[getTarget];
}

function extendTemplate(base: string, append: string | null) {
  if (append && append.match(/<parent\/>/)) {
    return append.replace(/<parent\/>/, base);
  } else {
    return `${base}${append || ''}`;
  }
}

function camelToDash(str: string): string {
  return str.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase()
}

function dashToCamel(str: string): string {
  return str.replace(/-([a-z])/g, m => m[1].toUpperCase());
}

export function Component(config: CustomElementConfig = {}) {
  return function (cls: any, context?: any) {
    if (context.kind !== 'class') {
      throw new Error('@Component() can only decorate a class');
    }
    // webpack removes class names, override name
    Reflect.defineProperty(cls, 'name', {
      value: config.selector,
      writable: false,
      configurable: false,
    });
    if (cls.prototype[parent] && !(cls.prototype[parent][cls.prototype[parent].length - 1] instanceof Object.getPrototypeOf(cls))) {
      cls.prototype[parent].push(cls.prototype);
      cls.prototype[style].push(config.style);
      cls.prototype[template] = extendTemplate(
        cls.prototype[template],
        config.template || null
      );
    } else if (cls.prototype instanceof HTMLElement) {
      cls.prototype[parent] = [cls.prototype];
      cls.prototype[style] = config.style ? [config.style] : [];
      cls.prototype[template] = config.template || '';
    }

    if (!cls.symbols) {
      cls.symbols = {};
    }

    const connectedCallback = cls.prototype.connectedCallback || (() => { });
    const disconnectedCallback = cls.prototype.disconnectedCallback || (() => { });

    cls.prototype.connectedCallback = function () {
      if (!this[init] && config.template === undefined && config.style === undefined) {
        if (config.useShadow === false) {
          // Base class with no template
        } else {
          this.attachShadow({ mode: 'open' });
        }
      } else if (!this[init]) {
        if (config.useShadow === false) {
          throw new Error('unsupported');
        } else {
          const $template = document.createElement('template');
          $template.innerHTML = cls.prototype[template] || '';
          const $node = document.importNode($template.content, true);
          const shadowRoot = this.attachShadow({ mode: 'open' });
          shadowRoot.adoptedStyleSheets = cls.prototype[style];
          shadowRoot.appendChild($node);
        }
      } else if (this[init] && config.style) {
        /*if (this.shadowRoot) {
          const style = document.createElement('style');
          style.appendChild(document.createTextNode(config.style));
          this.appendChild(style);
        }*/
        // } else if (this[init] && config.template) {
        // This is allowed now via <parent/>
        // throw new Error('template from base class cannot be overriden. Fix: remove template from @Component');
      } else if (this[init] && config.selector && !config.template) {
        throw new Error('You need to pass a template for an extended element.');
      }

      const tags = new Set<string>();
      for (const ele of this.shadowRoot.querySelectorAll('*')) {
        if (ele.localName.indexOf('-') !== -1) {
          tags.add(ele.localName);
        }
      }
      const promises = Array.from(tags.values()).map(tag => {
        return customElements.get(tag)
          ? Promise.resolve()
          : customElements.whenDefined(tag);
      });
      if (promises.length === 0) {
        this[init] = true;
        connectedCallback.call(this);
      } else {
        Promise.all(promises).then(() => {
          this[init] = true;
          connectedCallback.call(this);
          // dispatch slotchange
          for (const slot of this.shadowRoot.querySelectorAll('slot')) {
            slot.dispatchEvent(new CustomEvent('slotchange'));
          }
        });
      }

      this[parent].map((p: any) => {
        if (p.render) {
          p.render.call(
            this,
            cls.observedAttributes
              ? cls.observedAttributes.reduce((a: any, c: string) => {
                const n = dashToCamel(c);
                a[n] = true;
                return a;
              }, {})
              : {}
          );
        }
      });
    };

    cls.prototype.disconnectedCallback = function () {
      disconnectedCallback.call(this);
    };

    cls.prototype.attributeChangedCallback = function (name: string, oldValue: string | null, newValue: string | null) {
      const normalizedName = dashToCamel(name);
      this[normalizedName] = newValue;
    };

    // Base components may not define a selector
    context.addInitializer(function (this: any) {
      if (config.selector) {
        if (window.customElements.get(config.selector)) {
          throw new Error(`@Component() ${context.name} duplicate selector '${config.selector}'`);
        }
        window.customElements.define(config.selector, cls);
      }
    });
  };
}

const transmute = Symbol('transmute');

export function TransmutePart(part: string, selector: string) {
  return function (cls: any) {
    if (cls.prototype[transmute]) {
      cls.prototype[transmute][part] = selector;
    } else {
      cls.prototype[transmute] = { [part]: selector };
    }
  };
}

function isArray(a: any) {
  return (!!a) && (a.constructor === Array);
}

function isObject(a: any) {
  return (!!a) && (a.constructor === Object);
}

function render(self: any, propertyKey: string) {
  if (self[init]) {
    self[parent].map((p: any) => {
      if (p.render) {
        p.render.call(self, { [propertyKey]: true });
      }
    });
  }
}

function getSymbolType(value: any) {
  if (value === null) { return 'null' }
  return isArray(value) ? 'array' : typeof value;
}

export function Prop(normalize?: (value: any) => any): any {
  return function <C, V>(_: Object, context: ClassFieldDecoratorContext<C, V>) {
    const propertyKey = context.name as string;
    const symbol = Symbol(propertyKey);
    const symbolType = Symbol(`${propertyKey}:type`);
    const symbolMeta = Symbol(`${propertyKey}:meta`);
    context.addInitializer(function (this: any) {
      Reflect.defineProperty(this, propertyKey, {
        get: () => {
          if (this[symbolType] === 'object') {
            if (this[symbol][isProxy]) {
              return this[symbol];
            } else {
              return createProxy(this[symbol]);
            }
          }
          if (this[symbolType] === 'array') {
            if (this[symbol][isProxy]) {
              return this[symbol];
            } else {
              return createProxy(this[symbol]);
            }
          }
          return this[symbol];
        },
        set: (value) => {
          // ToDo: cleanup
          const newSymbolType = getSymbolType(normalize ? normalize(value) : value);
          if (
            propertyKey !== 'index' && this[symbolType] !== newSymbolType
            && this[symbolType] !== 'null' && newSymbolType !== 'null'
          ) {
            throw new Error(`@Prop() ${propertyKey} with type '${this[symbolType]}' cannot be set to ${newSymbolType}.`);
          }
          if (this[symbolType] === 'array') {
            if (!isArray(value)) {
              throw new PropError(`Array "${propertyKey}" (Prop) initialized already. Reassignments must be array type.`, Object.getOwnPropertyDescriptor(this, propertyKey)?.set);
            }
            if (this[symbol] === value) {
              throw new Error('Setting an array to itself is not allowed.');
            }
            const proxified = createProxy(this[symbol]);
            if (proxified[hasObserver]) {
              proxified.splice(0, this[symbol].length, ...value);
            } else {
              this[symbol] = value;
            }
          }
          else {
            this[symbol] = normalize ? normalize(value) : value;
            render(this, propertyKey);
          }
        }
      });
    });
    return function (this: any, initialValue: any) {
      if (initialValue === undefined && propertyKey !== 'index') {
        throw new Error(`@Prop() ${propertyKey} must have an initial value defined.`);
      } else if (initialValue !== undefined && propertyKey === 'index') {
        throw new Error(`@Prop() index must not have an initial value defined.`);
      }
      if (initialValue === true) {
        throw new Error(`@Prop() ${propertyKey} boolean must initialize to false.`);
      }
      // Web Component, todo: refactor to only be called once
      if (!context.private) {
        const { constructor } = this as any;
        constructor.observedAttributes ??= [];
        if (!constructor.symbols) {
          constructor.symbols = {};
        }
        const { symbols } = constructor;
        const normalizedPropertyKey = camelToDash(propertyKey);
        if (!symbols[propertyKey]) {
          constructor.observedAttributes.push(normalizedPropertyKey);
          symbols[propertyKey] = symbol;
        }
      }
      // Rest
      this[symbolType] = getSymbolType(initialValue);
      if (this[symbolType] === 'array') {
        this[symbol] = initialValue;
        return new Proxy(initialValue, {
          get: (target, key) => {
            if (key === meta) {
              return this[symbolMeta];
            }
            console.log('errr???')
            return Reflect.get(this[symbol], key);
          },
          set: (target, key, v) => {
            if (key === meta) {
              this[symbolMeta] = v;
              return true;
            }
            const x = Reflect.set(target, key, v);
            if (!(key === 'length' && this[symbol].length === v)) {
              render(this, propertyKey);
            }
            this[symbol] = v;
            return x;
          }
        });
      }
      // todo watch objects???
      this[symbol] = normalize
        ? normalize(this.getAttribute(propertyKey) ?? initialValue)
        : this.getAttribute(propertyKey) ?? initialValue;
      return this[symbol];
    };
  };
}

export function Part(): any {
  return function (_: Object, context: ClassFieldDecoratorContext) {
    const propertyKey = context.name as string;
    const key = propertyKey.replace(/^\$/, '');
    context.addInitializer(function (this: any) {
      let cache: any = null;
      Reflect.defineProperty(this, propertyKey, {
        get() {
          return cache ?? (cache = this.shadowRoot?.querySelector(`[part~=${key}]`));
        }
      })
    });
  };
}

/**
 * Store data via a Map into LocalStorage
 * @param key String
 * @returns Value
 */
export function Local(key: string): any {
  return function (_: any, context: ClassFieldDecoratorContext) {
    const propertyKey = context.name as string;
    return function (initialValue: Map<string, any>) {
      if (!(initialValue instanceof Map)) {
        throw new Error('@Local(key) property must be type Map');
      }
      return new Proxy(initialValue, {
        get(target, prop: string) {
          switch (prop) {
            case 'get':
              return (k: string) => {
                if (!initialValue.has(k)) {
                  throw new Error(`@Local(key) missing key ${k}`);
                }
                const storeKey = `${key}:${k}`;
                if (window.localStorage.getItem(storeKey) === null) {
                  return initialValue.get(k);
                } else {
                  return JSON.parse(window.localStorage.getItem(storeKey) ?? 'null');
                }
              };
            case 'set':
              return (k: string, v: any) => {
                if (!initialValue.has(k)) {
                  throw new Error(`@Local(key) missing key ${k}`);
                }
                const storeKey = `${key}:${k}`;
                if (v === null || JSON.stringify(v) === JSON.stringify(initialValue.get(k))) {
                  // todo? Reset to initial value
                  window.localStorage.removeItem(storeKey);
                } else {
                  window.localStorage.setItem(storeKey, JSON.stringify(v));
                }
              };
            default:
              throw new Error(`@Local(key) supported method ${prop}`);
          }
        }
      });
    };
  };
}

// Utils

interface TemplateAttribute {
  [part: string]: Function | string | number | null
}

interface TemplatePart {
  [part: string]: TemplateAttribute
}

export function node<T>(template: string, init: TemplatePart): T {
  const $template = document.createElement('template');
  $template.innerHTML = template;
  const $node = document.importNode($template.content, true);
  for (const [part, attributes] of Object.entries(init)) {
    const $part = $node.querySelector<any>(`[part~="${part}"]`);
    if ($part) {
      for (const [prop, value] of Object.entries(attributes)) {
        if (value instanceof Function) {
          const val = value();
          if (val === null) {
            $part.removeAttribute(prop);
          } else {
            $part.setAttribute(prop, value());
          }
        } else {
          $part[prop] = value;
        }
      }
    }
  }
  return $node as any;
}

export function normalizeInt(value: any): number {
  return parseInt(`${value}`, 10);
}

export function normalizeFloat(value: any): number {
  return parseFloat(`${value}`);
}

export function normalizeBoolean(value: any): boolean {
  return value === '' || value === true
    ? true
    : value === null || value === false
      ? false
      : value || true;
}

export function normalizeString(value: any): string {
  return `${value}`;
}

export type Changes = {
  [key: string]: boolean
}

const trackProxy = Symbol('hasProxy');
function hasProxy(obj: any) {
  if (obj === null || typeof obj !== "object") return false;
  return obj[trackProxy];
}

const meta = Symbol('meta');

interface ArrayWithMetaAndBind extends Array<any> {
  [key: number]: any;
  [meta]?: Map<HTMLElement, any>;
}

type ForEach = {
  container: HTMLElement;
  items: any;
  type: (item: any) => any;
  create?: ($item: HTMLElement, item: any) => void;
  update?: ($item: HTMLElement, item: any) => void;
  connect?: ($item: HTMLElement, item: any) => void;
  disconnect?: ($item: HTMLElement, item: any) => void;
}

function intersect(arr1: string[], arr2: string[]) {
  const set1 = new Set(arr1);
  return arr2.filter(item => set1.has(item));
}

function difference(arr1: string[], arr2: string[]) {
  return arr1.filter(str => !arr2.includes(str));
}

export function forEach({ container, items, type, create, connect, disconnect, update }: ForEach) {
  function newItem(item: any, itemIndex: number) {
    const comp = type(item);
    const $new = document.createElement(camelToDash(comp.name), comp);
    const { observedAttributes } = comp;
    const props = intersect(Object.keys(item), observedAttributes);
    if (observedAttributes.includes('index')) {
      //@ts-ignore
      $new['index'] = itemIndex;
    }
    let idx = props.indexOf('index');
    if (idx !== -1) {
      props.splice(props.indexOf('index'), 1);
    }
    props.forEach((attr: string) => {
      //@ts-ignore
      $new[attr] = item[attr];
    });
    create && create($new, item);
    items[itemIndex][addObserver]($new, (prop: string, value: string) => {
      // @ts-ignore
      $new[prop] = value;
    });
    return $new;
  }
  // Add initial items
  items.forEach((item: any, i: number) => {
    const $new = newItem(item, i);
    container.appendChild($new);
    connect && connect($new, item);
  });
  // Handle each mutation
  items[addObserver](container, (target: any, prop: any, args: any[]) => {
    switch(prop) {
      case Mutation.fill:
        // this could be optimized more, but would need the previous items keys
        const [value, start, end] = args;
        for (let i = start || 0; i < (end || items.length); i++) {
          Object.keys(value).forEach((key) => {
            // @ts-ignore
            container.children[i][key] = value[key];
          });
        }
        break;
      case Mutation.pop:
        const count = container.children.length;
        if (count > 0) {
          container.children[count - 1].remove();
        }
        break;
      case Mutation.push:
        const last = container.children.length;
        [...args].forEach((item: any, i) => {
          const $new = newItem(item, last + i);
          container.appendChild($new);
          connect && connect($new, item);
        });
        break;
      case Mutation.reverse:
        for (var i = 1; i < container.children.length; i++){
          container.insertBefore(container.children[i], container.children[0]);
        }
        break;
      case Mutation.shift:
        if (container.children.length) {
          container.children[0].remove();
        }
        break;
      case Mutation.sort:
        throw new Error('ToDo... write sort.')
        break;
      case Mutation.splice:
        const [startIndex, deleteCount, ...newItems] = args;
        if (deleteCount > 0) {
          for (let i = startIndex; i < deleteCount + startIndex; i++) {
            container.children[i].remove();
          }
        }
        let newCount = newItems.length || 0;
        if (newCount > 0) {
          const nItems = newItems.map((item: any, i: number) => {
            return newItem(item, startIndex + i)
          });
          if (startIndex === 0) {
            container.append(...nItems);
          } else {
            container.children[startIndex].after(...nItems);
          }
          nItems.forEach(($new) => {
            connect && connect($new, newItems[i]);
          })
        }
        const shift = deleteCount - newCount;
        if (shift > 0 && startIndex + shift - 1 > 0) {
          // update index values after
          for (let i = startIndex + shift - 1; i < container.children.length; i++) {
            // @ts-ignore
            container.children[i].index = i;
          }
        }
        break;
      case Mutation.unshift:
        const first = container.children.length && container.children[0];
        [...args].forEach((item: any, i) => {
          if (first) {
            first.before(newItem(item, i));
          } else {
            container.appendChild(newItem(item, i));
          }
        });
        break;
    }
  });
}

// JEST

export function selectComponent<T>(tagName: string): T {
  const component = document.querySelector(tagName) as any;
  const tags = new Set<string>();
  let shadowRoot;
  try {
    shadowRoot = component.shadowRoot;
  } catch (error: any) {
    throw new Error('Add the component via document.body.appendChild(...) before selectComponent.');
  }
  for (const ele of shadowRoot.querySelectorAll('*')) {
    if (ele.localName.indexOf('-') !== -1) {
      tags.add(ele.localName);
    }
  }
  for (var it = tags.values(), tag = null; tag = it.next().value;) {
    if (!customElements.get(tag)) {
      const namespaceMatch = tag.match(/^([^-]+)/);
      if (namespaceMatch === null || namespaceMatch.length > 1) {
        throw new Error('Failed to parse namespace.');
      }
      const namespace = namespaceMatch[1];
      const componentMatch = tag.match(/^[^-]+-(.+)/);
      if (componentMatch === null || componentMatch.length > 1) {
        throw new Error('Failed to parse component name.');
      }
      const componentName = dashToCamel(componentMatch[1]);
      throw new Error(`Missing \`import '../${componentName}/${componentName}';\` in spec.ts file.`);
    }
  }
  return component;
}

export function selectPart<T>(component: HTMLElement, name: string): T {
  return component.shadowRoot!.querySelector(`[part=${name}]`) as any;
}

export function getProps(tag: string): string[] {
  const { symbols } = customElements.get(tag) as any;
  return Object.keys(symbols);
}