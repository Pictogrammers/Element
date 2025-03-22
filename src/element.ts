import './global';

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

const init = Symbol('init');
const template = Symbol('template');
const style = Symbol('style');
const parent = Symbol('parent');

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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
    if (cls.prototype[parent]) {
      cls.prototype[parent].push(cls.prototype);
      cls.prototype[style].push(config.style);
      cls.prototype[template] = extendTemplate(
        cls.prototype[template],
        config.template || null
      );
    } else {
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
  return isArray(value) ? 'array' : typeof value;
}

const arrayRender = ['fill', 'pop', 'push', 'reverse', 'shift', 'slice', 'sort', 'splice', 'unshift', 'with'];
const arrayRead = ['forEach', 'map'];

export function Prop(normalize?: (value: any) => any): any {
  return function <C, V>(_: Object, context: ClassFieldDecoratorContext<C, V>) {
    const propertyKey = context.name as string;
    const symbol = Symbol(propertyKey);
    const symbolType = Symbol(`${propertyKey}:type`);
    const symbolMeta = Symbol(`${propertyKey}:meta`);
    context.addInitializer(function (this: any) {
      Reflect.defineProperty(this, propertyKey, {
        get: () => {
          if (this[symbolType] !== 'array') {
            return this[symbol];
          }
          return new Proxy(this[symbol], {
            get: (target: any, key: any) => {
              if (key === meta) {
                return this[symbolMeta];
              }
              if (arrayRender.includes(key)
                && typeof target[key] === 'function') {
                // @ts-ignore
                const self = this;
                return (...args: any) => {
                  const result = target[key](...args);
                  bindForEach(target);
                  if (this[symbolMeta]) {
                    renderForEach(target, self[symbolMeta]);
                    self[symbolMeta].forEach(({ host }: any) => {
                      render(host, propertyKey);
                    });
                  } else {
                    render(this, propertyKey);
                  }
                  return result;
                };
              }
              else if (arrayRead.includes(key)) {
                return (...args: any) => {
                  return target[key](...args);
                };
              }
              return Reflect.get(this[symbol], key);
            },
            set: (target, key, v) => {
              if (key === meta) {
                this[symbolMeta] = v;
                return true;
              }
              return Reflect.set(target, key, v);
            }
          });
        },
        set: (value) => {
          // ToDo: cleanup
          const newSymbolType = getSymbolType(normalize ? normalize(value) : value);
          if (propertyKey !== 'index' && this[symbolType] !== newSymbolType) {
            throw new Error(`@Prop() ${propertyKey} with type '${this[symbolType]}' cannot be set to ${newSymbolType}.`);
          }
          if (this[symbolType] === 'array') {
            if (!isArray(value)) {
              throw new PropError(`Array "${propertyKey}" (Prop) initialized already. Reassignments must be array type.`, Object.getOwnPropertyDescriptor(this, propertyKey)?.set);
            }
            bindForEach(value);
            if (this[symbol] === value) {
              throw new Error('Setting an array to itself is not allowed.');
            }
            // Process binded array...
            if (value[meta]) {
              // Mirror underlying values
              this[symbolMeta].forEach(({ host: x }: any) => {
                value[meta].forEach(({ host: y }: any) => {
                  x[symbol] = y[symbol];
                });
              });
              // Merge meta data
              this[symbolMeta].forEach((item: any, key: any) => {
                value[meta].forEach(() => {
                  value[meta].set(key, item);
                });
              });
            }
            else {
              this[symbol].splice(0, this[symbol].length, ...value);
              // has to be in the dom!!!
              if (this[symbolMeta]) {
                renderForEach(this[symbol], this[symbolMeta]);
              }
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
      // Web Component
      if (!context.private) {
        const { constructor } = this as any;
        constructor.observedAttributes ??= [];
        if (!constructor.symbols) {
          constructor.symbols = {};
        }
        const { symbols } = constructor;
        const normalizedPropertyKey = camelToDash(propertyKey);
        constructor.observedAttributes.push(normalizedPropertyKey);
        symbols[propertyKey] = symbol;
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
            if (this[symbolMeta]
              && arrayRender.includes(key as any)
              && typeof target[key] === 'function') {
              // @ts-ignore
              const self = this;
              return (...args: any) => {
                const result = target[key](...args);
                bindForEach(target);
                renderForEach(target, self[symbolMeta]);
                self[symbolMeta].forEach(({ host }: any) => {
                  render(host, propertyKey);
                });
                return result;
              };
            } else if (arrayRead.includes(key as any)) {
              return (...args: any) => {
                return target[key](...args);
              };
            }
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
function hasProxy(obj: object) {
  if (obj === null || typeof obj != "object") return false;
  return trackProxy in obj;
}

const meta = Symbol('meta');
const bind = Symbol('bind');

interface ArrayWithMetaAndBind extends Array<any> {
  [key: number]: any;
  [meta]?: Map<HTMLElement, any>;
}

type ForEach = {
  container: HTMLElement;
  items: ArrayWithMetaAndBind;
  type: (item: any) => any;
  create?: ($item: HTMLElement, item: any) => void;
  update?: ($item: HTMLElement, item: any, $items: HTMLElement[]) => void;
  connect?: ($item: HTMLElement, item: any, $items: HTMLElement[]) => void;
  disconnect?: ($item: HTMLElement, item: any, $items: HTMLElement[]) => void;
}

export function forEach({ container, items, type, create, connect, disconnect, update }: ForEach) {
  const { host } = container.getRootNode() as any as { host: HTMLElement };
  items[meta] ??= new Map<HTMLElement, any>();
  items[meta].set(container, { host, type, create, connect, disconnect, update });
  // already attached, so init
  if (items.length) {
    renderForEach(items);
  }
}

function renderForEach(items: ArrayWithMetaAndBind, privateMeta?: Map<HTMLElement, any>) {
  // todo: make a list of cached item keys
  const actualMeta = privateMeta ?? items[meta];
  actualMeta?.forEach((value: any, c: HTMLElement) => {
    // @ts-ignore
    const { type, create, connect, disconnect, update } = value;
    const existing = new Map();
    const existingKeys: string[] = [];
    Array.from(c.children).map(($item: any) => {
      existing.set($item.dataset.key, $item);
      existingKeys.push($item.dataset.key);
    });
    // Delete elements no longer in list
    const latest = items.map(x => `${x.key}`);
    const deleteItems = existingKeys.filter(x => !latest.includes(x));
    deleteItems.forEach((x) => {
      existingKeys.findIndex(y => y === x);
      const delEle = existing.get(x);
      const { observedAttributes } = delEle.constructor;
      // Extract values from deleted element
      const o = observedAttributes.reduce((obj: any, p: string) => {
        obj[p] = delEle[p];
        return obj;
      }, {});
      disconnect && disconnect(delEle, o, c.children);
      delEle.remove();
    });
    let previous: any = null;
    // Update or Insert elements
    items.forEach((option, i) => {
      const { key, ...options } = option;
      if (existing.has(`${key}`)) {
        // delete this?
        options.index = i;
        update && update(existing.get(`${key}`), options, c.children);
      } else {
        option.type = type(options);
        const $new = document.createElement(camelToDash(option.type.name), option.type);
        const { observedAttributes } = option.type;
        option[meta].set($new, {});
        $new.dataset.key = `${option.key}`;
        if (!options.hasOwnProperty('index')) {
          option.index = i;
        }
        observedAttributes.forEach((attr: string) => {
          if (options.hasOwnProperty(attr)) {
            //@ts-ignore
            $new[attr] = option[attr];
          }
        });
        create && create($new, options);
        if (previous) {
          existing.get(previous).after($new);
        } else {
          c.prepend($new);
        }
        connect && connect($new, options, c.children);
        existing.set(`${option.key}`, $new);
      }
      previous = `${option.key}`;
    });
  });
}

// todo: looping all items is lazy
function bindForEach(value: any[]) {
  value.forEach(function (v, i) {
    if (!hasProxy(v)) {
      // keys should always be set, without it can't track
      v.key ??= uuid();
      const symbol = Symbol(`${v.key}`);
      const symbolMeta = Symbol(`${v.key}:meta`);
      // @ts-ignore
      value[symbol] = v;
      // @ts-ignore
      value[symbolMeta] = new Map<HTMLElement, any>();
      value.splice(i, 1, new Proxy(v, {
        get: function (target, prop) {
          if (prop === meta) {
            // @ts-ignore
            return value[symbolMeta];
          }
          // @ts-ignore
          return value[symbol][prop];
        },
        set: function (target, prop, val) {
          if (prop === meta) {
            // @ts-ignore
            value[symbolMeta] = val;
            return true;
          }
          // @ts-ignore
          value[symbol][prop] = val;
          // @ts-ignore
          const binded = value[symbolMeta];
          binded && (binded.forEach((v: any, ele: any) => ele[prop] = val));
          return Reflect.set(target, prop, val);
        },
        has(o, prop) {
          if (prop == trackProxy) return true;
          return prop in o;
        }
      }));
    }
  });
}

// JEST

export function selectComponent<T>(tagName: string): T {
  const component = document.querySelector(tagName) as any;
  const tags = new Set<string>();
  for (const ele of component.shadowRoot.querySelectorAll('*')) {
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