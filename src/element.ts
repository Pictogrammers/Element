import './global.js';
import {
  Mutation,
  createProxy,
  addObserver,
  removeObserver,
  swapObserver,
  hasObserver,
  isProxy,
  getTarget
} from './proxy.js';

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
const renderList = Symbol('renderList');

export function getProxyValue(obj: any) {
  return obj[isProxy] && obj[getTarget];
}

function extendTemplate(base: string, append: string | null) {
  if (append && append.match(/<parent\/>/)) {
    return append.replace(/<parent\/>/, base);
  } else if (base.match(/<child\/>/)) {
    return base.replace(/<child\/>/, append || '');
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
    // ToDo: Clean up naming. cls is not used only render
    if (cls[parent]) {
      cls[parent] = [...cls[parent], cls];
      if (cls.prototype.render) {
        cls[renderList] = [...cls[renderList], cls.prototype.render];
      }
      if (config.style) {
        cls[style] = [...cls[style], config.style];
      }
      cls[template] = extendTemplate(
        cls[parent][cls[parent].length - 1][template],
        config.template || null
      );
    } else if (cls.prototype instanceof HTMLElement) {
      cls[parent] = [cls];
      cls[renderList] = cls.prototype.render ? [cls.prototype.render] : [];
      cls[style] = config.style ? [config.style] : [];
      cls[template] = config.template || '';
    } else {
      throw new Error(`Must extend from HTMLElement`);
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
          $template.innerHTML = cls[template] || '';
          const $node = document.importNode($template.content, true);
          const shadowRoot = this.attachShadow({ mode: 'open' });
          shadowRoot.adoptedStyleSheets = cls[style].reduce((acc: any[], value: any) => {
              if (!value) {
                  return acc;
              }
              if (value instanceof CSSStyleSheet) {
                  acc.push(value);
                  return acc;
              }
              var s = new CSSStyleSheet();
              s.replaceSync(value.toString());
              acc.push(s);
              return acc;
          }, []);
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
      const render = () => {
        this.constructor[renderList].map((renderFn: any) => {
          renderFn.call(
            this,
            cls.observedAttributes
              ? cls.observedAttributes.reduce((a: any, c: string) => {
                const n = dashToCamel(c);
                a[n] = true;
                return a;
              }, {})
              : {}
          );
        });
      }
      if (promises.length === 0) {
        this[init] = true;
        connectedCallback.call(this);
        render();
      } else {
        Promise.all(promises).then(() => {
          this[init] = true;
          connectedCallback.call(this);
          // dispatch slotchange
          for (const slot of this.shadowRoot.querySelectorAll('slot')) {
            slot.dispatchEvent(new CustomEvent('slotchange'));
          }
          render();
        });
      }
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
    self.constructor[renderList].map((renderFn: any) => {
      renderFn.call(self, { [propertyKey]: true });
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
            if (proxified[hasObserver](this)) {
              const unproxyValue = value[isProxy] ? value[getTarget] : value;
              proxified[swapObserver](this, unproxyValue);
              this[symbol] = value;
              // render(this, propertyKey); // do we need to trigger this for arrays being remapped?
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

const PROP_ALIAS: Record<string, string> = { id: 'itemId' };

function mapPropKey(key: string, allProps: string[]): string {
  const alias = PROP_ALIAS[key];
  return alias && allProps.includes(alias) ? alias : key;
}

export function forEach({ container, items, type, create, connect, disconnect, update }: ForEach) {
  if (!Array.isArray(items)) {
    throw new Error('forEach `items` must be an array');
  }
  const elementMap = new WeakMap<object, HTMLElement>();
  // Tracks raw item objects in items-array order; used to recover pre-mutation state.
  const localItems: any[] = [];

  function raw(item: any): any {
    return item && (item as any)[isProxy] ? (item as any)[getTarget] : item;
  }

  function isRendered(rawItem: any): boolean {
    return elementMap.has(rawItem);
  }

  function renderedCountBefore(logicalIndex: number): number {
    let count = 0;
    for (let i = 0; i < logicalIndex && i < localItems.length; i++) {
      if (isRendered(localItems[i])) count++;
    }
    return count;
  }

  function newItem(item: any, domIndex: number): HTMLElement | null {
    const comp = type(item);
    if (comp === null) return null;
    const $new = document.createElement(camelToDash(comp.name), comp);
    const allProps = Object.keys(comp.symbols);
    const props = intersect(Object.keys(item), allProps);
    if (allProps.includes('index')) {
      //@ts-ignore
      $new['index'] = domIndex;
    }
    props.forEach((attr: string) => {
      // index is already written
      if (attr === 'index') { return; }
      //@ts-ignore
      $new[attr] = item[attr];
    });
    // Apply prop aliases (e.g., data `id` → component `itemId`) when not already set above
    for (const [dataKey, compKey] of Object.entries(PROP_ALIAS)) {
      if (dataKey in item && allProps.includes(compKey) && !props.includes(compKey)) {
        //@ts-ignore
        $new[compKey] = item[dataKey];
      }
    }
    const rawItem = raw(item);
    create && create($new, createProxy(rawItem));
    createProxy(rawItem)[addObserver as any]($new, (prop: string, value: string) => {
      // @ts-ignore
      $new[mapPropKey(prop, allProps)] = value;
    });
    elementMap.set(rawItem, $new);
    return $new;
  }

  // Add initial items
  let initDomIndex = 0;
  items.forEach((item: any) => {
    const rawItem = raw(item);
    localItems.push(rawItem);
    const $new = newItem(item, initDomIndex);
    if ($new === null) return;
    container.appendChild($new);
    connect && connect($new, createProxy(rawItem));
    initDomIndex++;
  });

  // Handle each mutation
  items[addObserver as any](container, (target: any, prop: any, args: any[]) => {
    if (prop === Mutation.swap) {
        const oldLength = localItems.length;
        items = createProxy(args[0]);
        // re-use splice to delete old nodes and add new ones (performance?)
        prop = Mutation.splice;
        args = [0, oldLength, ...args[0]];
    }
    switch(prop) {
      case Mutation.fill: {
        const [value, start, end] = args;
        const fillStart = start || 0;
        const fillEnd = end || localItems.length;
        let domFillIdx = renderedCountBefore(fillStart);
        for (let i = fillStart; i < fillEnd; i++) {
          if (isRendered(localItems[i])) {
            const $child = container.children[domFillIdx] as any;
            const childAllProps = Object.keys($child.constructor?.symbols ?? {});
            Object.keys(value).forEach((key) => {
              // @ts-ignore
              $child[mapPropKey(key, childAllProps)] = value[key];
            });
            domFillIdx++;
          }
          localItems[i] = value;
        }
        break;
      }
      case Mutation.pop: {
        const poppedRaw = localItems[localItems.length - 1];
        if (poppedRaw !== undefined && isRendered(poppedRaw)) {
          container.children[container.children.length - 1].remove();
          elementMap.delete(poppedRaw);
        }
        localItems.pop();
        break;
      }
      case Mutation.push: {
        [...args].forEach((item: any) => {
          const rawItem = raw(item);
          localItems.push(rawItem);
          const $new = newItem(item, container.children.length);
          if ($new === null) return;
          container.appendChild($new);
          connect && connect($new, createProxy(rawItem));
        });
        break;
      }
      case Mutation.reverse: {
        for (var i = 1; i < container.children.length; i++){
          container.insertBefore(container.children[i], container.children[0]);
        }
        localItems.reverse();
        break;
      }
      case Mutation.shift: {
        const shiftedRaw = localItems[0];
        if (shiftedRaw !== undefined && isRendered(shiftedRaw)) {
          container.children[0].remove();
          elementMap.delete(shiftedRaw);
        }
        localItems.shift();
        for (let i = 0; i < container.children.length; i++) {
          // @ts-ignore
          container.children[i].index = i;
        }
        break;
      }
      case Mutation.sort: {
        (target as any[]).forEach((item: any) => {
          const rawItem = raw(item);
          const $el = elementMap.get(rawItem);
          if ($el) container.appendChild($el);
        });
        for (let i = 0; i < container.children.length; i++) {
          // @ts-ignore
          container.children[i].index = i;
        }
        localItems.length = 0;
        (target as any[]).forEach((item: any) => localItems.push(raw(item)));
        break;
      }
      case Mutation.splice: {
        const [startIndex, deleteCount, ...newItems] = args;
        if (startIndex < 0) {
          throw new Error('invalid startIndex, must be greater than or equal to 0');
        }
        // Determine the DOM insertion/deletion point by counting rendered items before startIndex.
        const domStart = renderedCountBefore(startIndex);
        // Remove deleted items from DOM (always remove at domStart since children shift up).
        const deletedRaws = localItems.slice(startIndex, startIndex + deleteCount);
        deletedRaws.forEach((rawItem) => {
          if (isRendered(rawItem)) {
            container.children[domStart].remove();
            elementMap.delete(rawItem);
          }
        });
        // Create elements for new items, skipping null-typed ones.
        const nItems: HTMLElement[] = [];
        newItems.forEach((item: any) => {
          const $new = newItem(item, domStart + nItems.length);
          if ($new !== null) nItems.push($new);
        });
        if (nItems.length > 0) {
          if (domStart === 0) {
            container.prepend(...nItems);
          } else {
            container.children[domStart - 1].after(...nItems);
          }
        }
        // Update indices for all items from the insertion point onward.
        for (let i = domStart; i < container.children.length; i++) {
          // @ts-ignore
          container.children[i].index = i;
        }
        // Fire connect for each newly rendered item.
        let nIdx = 0;
        newItems.forEach((item: any) => {
          const rawItem = raw(item);
          if (isRendered(rawItem)) {
            connect && connect(nItems[nIdx++], createProxy(rawItem));
          }
        });
        localItems.splice(startIndex, deleteCount, ...newItems.map(raw));
        break;
      }
      case Mutation.unshift: {
        const unshiftItems = [...args];
        const firstChild = container.children.length ? container.children[0] : null;
        const nItems: HTMLElement[] = [];
        unshiftItems.forEach((item: any) => {
          const $new = newItem(item, nItems.length);
          if ($new !== null) nItems.push($new);
        });
        if (nItems.length > 0) {
          if (firstChild) {
            firstChild.before(...nItems);
          } else {
            container.append(...nItems);
          }
        }
        // Update indices for all items (new ones first, then existing).
        for (let i = 0; i < container.children.length; i++) {
          // @ts-ignore
          container.children[i].index = i;
        }
        localItems.unshift(...unshiftItems.map(raw));
        // Fire connect for each newly rendered item.
        let nIdx = 0;
        unshiftItems.forEach((item: any) => {
          const rawItem = raw(item);
          if (isRendered(rawItem)) {
            connect && connect(nItems[nIdx++], createProxy(rawItem));
          }
        });
        break;
      }
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
  return Object.keys(symbols ?? {});
}