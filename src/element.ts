interface CustomElementConfig {
  selector?: string;
  template?: string;
  style?: string;
  useShadow?: boolean;
}

interface Constructor {
  symbols: object,
  observedAttributes: string[]
}

const init = Symbol('init');
const template = Symbol('template');
const style = Symbol('style');
const parent = Symbol('parent');

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
  return function (cls: any, _context?: any) {
    if (cls.prototype[parent]) {
      cls.prototype[parent].push(cls.prototype);
      cls.prototype[style] = `${cls.prototype[style]}${config.style}`;
      cls.prototype[template] = extendTemplate(
        cls.prototype[template],
        config.template || null
      );
    } else {
      cls.prototype[parent] = [cls.prototype];
      cls.prototype[style] = config.style || '';
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
        const $template = document.createElement('template');
        let content = cls.prototype[template] || '';
        if (cls.prototype[style]) {
          content += `<style>${cls.prototype[style]}</style>`;
        }
        $template.innerHTML = content;
        const $node = document.importNode($template.content, true);
        if (config.useShadow === false) {
          this.appendChild($node);
        } else {
          this.attachShadow({ mode: 'open' }).appendChild($node);
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
      } else if (this[init] && !config.template) {
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

    if (config.selector && !window.customElements.get(config.selector)) {
      window.customElements.define(config.selector, cls);
    }
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

const arrayRender = ['pop', 'push', 'reverse', 'shift', 'slice', 'sort', 'splice'];

export function Prop(normalize?: (value: any) => any): any {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor | any) {
    const { constructor } = target;
    if (!constructor.observedAttributes) {
      constructor.observedAttributes = [];
    }
    const { observedAttributes } = constructor as Constructor;
    if (!constructor.symbols) {
      constructor.symbols = {};
    }
    const { symbols }: { symbols: any } = constructor as Constructor;
    const normalizedPropertyKey = camelToDash(propertyKey);
    constructor.observedAttributes = observedAttributes.concat([normalizedPropertyKey]);
    const symbol = Symbol(propertyKey);
    symbols[propertyKey] = symbol;
    if (descriptor) {
      let get = descriptor.get!;
      descriptor.get = function () {
        return get.call(this);
      };
      let set = descriptor.set!;
      descriptor.set = function (value: any) {
        set.call(this, value);
        this[symbol] = value;
        render(this, propertyKey);
      };
    } else {
      Object.defineProperty(target, propertyKey, {
        get() {
          return this[symbol];
        },
        set(value) {
          if (isArray(value)) {
            if (value !== undefined && !isArray(value)) {
              throw new Error(`Anti-pattern (${propertyKey}): Do not reassign array type.`)
            }
            if (!this[symbol] || !this[symbol][symbol]) {
              const self = this;
              this[symbol] = new Proxy(value, {
                get: function (target, prop: any) {
                  if (arrayRender.includes(prop) && typeof target[prop] === 'function') {
                    return (...args: any) => {
                      const result = target[prop](...args);
                      render(self, propertyKey);
                      return result;
                    };
                  }
                  return Reflect.get(target, prop);
                },
                set: function (target, prop, value) {
                  const x = Reflect.set(target, prop, value);
                  if (!self[symbol][symbol].ignore) {
                    render(self, propertyKey);
                  }
                  return x;
                }
              });
              this[symbol][symbol] = { ignore: true };
            }
            this[symbol][symbol].ignore = true;
            Reflect.set(this[symbol], 'length', 0);
            value.forEach((v: any, i: number) => {
              Reflect.set(this[symbol], `${i}`, v);
            });
            render(this, propertyKey);
            this[symbol][symbol].ignore = false;
          } else {
            this[symbol] = normalize ? normalize(value) : value;
            render(this, propertyKey);
          }
        }
      });
    }
  };
}

export function Part(): any {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    if (descriptor) {
      throw `Invalid, value must be undefined \`@Part() ${propertyKey};\``;
    }
    Object.defineProperty(target, propertyKey, {
      get() {
        const key = propertyKey.replace(/^\$/, '');
        return this.shadowRoot?.querySelector(`[part~=${key}]`);
      }
    });
  };
}

export function Local(initialValue: string | null = null, key?: string): any {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const getKey = (self: any) => {
      return (key ? key : `${self.constructor.name}:${propertyKey}`) as string;
    };
    Object.defineProperty(target, propertyKey, {
      get() {
        const k = getKey(this);
        return window.localStorage.getItem(k) || initialValue;
      },
      set(value: string | null) {
        const k = getKey(this);
        if (value === null) {
          window.localStorage.removeItem(k);
        } else {
          window.localStorage.setItem(k, value);
        }
      }
    });
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
    : value === null
      ? false
      : value || true;
}

export function normalizeString(value: any): string {
  return `${value}`;
}


type ForEach = {
  container: HTMLElement;
  items: any[];
  type: (item: any) => any;
  create?: ($item: HTMLElement, item: any) => void;
  update?: ($item: HTMLElement, item: any) => void;
}

export function forEach({ container, items, type, create, update }: ForEach) {
  const existing = new Map();
  Array.from(container.children).map(($item: any) => {
    existing.set($item.dataset.key, $item);
  });
  // Delete elements no longer in list
  const latest = items.map(x => x.key);
  const deleteItems = Array.from(existing.keys()).filter(x => !latest.includes(x));
  deleteItems.forEach(x => existing.get(x).remove());
  let previous: any = null;
  // Update or Insert elements
  items.forEach((option, i) => {
    const { key, ...options } = option;
    if (existing.has(key)) {
      Object.assign(existing.get(key), options);
      update && update(existing.get(key), options);
    } else {
      option.type = type(options);
      const $new = document.createElement(camelToDash(option.type.name), option.type);
      $new.dataset.key = option.key;
      Object.assign($new, options);
      create && create($new, options);
      if (previous) {
        existing.get(previous).after($new);
      } else {
        container.prepend($new);
      }
      existing.set(option.key, $new);
    }
    previous = option.key;
  });
}

// JEST

export async function selectComponent<T>(tagName: string): Promise<T> {
  const component = document.querySelector(tagName) as any;
  const tags = new Set<string>();
  for (const ele of component.shadowRoot.querySelectorAll('*')) {
    if (ele.localName.indexOf('-') !== -1) {
      tags.add(ele.localName);
    }
  }
  for (var it = tags.values(), tag = null; tag = it.next().value;) {
    if (!customElements.get(tag)) {
      const namespace = tag.match(/^([^-]+)/)[1];
      const componentName = dashToCamel(tag.match(/^[^-]+-(.+)/)[1]);
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