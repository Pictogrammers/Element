interface CustomElementConfig {
  selector: string;
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

export function Component(config: CustomElementConfig) {
  return function (cls: any) {
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

    const connectedCallback = cls.prototype.connectedCallback || (() => { });
    const disconnectedCallback = cls.prototype.disconnectedCallback || (() => { });

    cls.prototype.connectedCallback = function () {
      if (!this[init] && config.template) {
        const $template = document.createElement('template');
        $template.innerHTML = `${cls.prototype[template]}<style>${cls.prototype[style]}</style>`;
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
      } else if (this[init] && config.template) {
        throw new Error('template from base class cannot be overriden. Fix: remove template from @Component');
      } else if (config.template) {
        throw new Error('You need to pass a template for the element');
      }

      if (this.componentWillMount) {
        this.componentWillMount();
      }
      this[parent].map((p: any) => {
        if (p.render) {
          p.render.call(this);
        }
      });
      this[init] = true;
      connectedCallback.call(this);
      if (this.componentDidMount) {
        this.componentDidMount();
      }
    };

    cls.prototype.disconnectedCallback = function () {
      if (this.componentWillUnmount) {
        this.componentWillUnmount();
      }
      disconnectedCallback.call(this);
      if (this.componentDidUnmount) {
        this.componentDidUnmount();
      }
    };

    cls.prototype.attributeChangedCallback = function (name: string, oldValue: string|null, newValue: string|null) {
      this[name] = newValue;
      // if (this.attributeChangedCallback) {
        // this.attributeChangedCallback(name, oldValue, newValue);
      // }
    };

    if (!window.customElements.get(config.selector)) {
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

export function Prop(): any {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const { constructor } = target;
    if (!constructor.observedAttributes) {
      constructor.observedAttributes = [];
    }
    const { observedAttributes } = constructor as Constructor;
    if (!constructor.symbols) {
      constructor.symbols = {};
    }
    const { symbols }: { symbols: any } = constructor as Constructor;
    observedAttributes.push(propertyKey);
    const symbol = Symbol(propertyKey);
    symbols[propertyKey] = symbol;
    Object.defineProperty(target, propertyKey, {
      get() {
        return this[symbol];
      },
      set(value: string) {
        this[symbol] = value;
        if (this[init]) {
          this[parent].map((p: any) => {
            if (p.render) {
              p.render.call(this);
            }
          });
        }
      }
    });
  };
}

export function Part(): any {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Object.defineProperty(target, propertyKey, {
      get() {
        const key = propertyKey.replace(/^\$/, '');
        return this.shadowRoot?.querySelector(`[part~=${key}]`);
      }
    });
  };
}

export function Local(key?: string, initialValue: string | null = null): any {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const k = (key === '' ? propertyKey : key) as string;
    Object.defineProperty(target, propertyKey, {
      get() {
        return window.localStorage.getItem(k) || initialValue;
      },
      set(value: string | null) {
        if (value === null) {
          window.localStorage.removeItem(k);
        } else {
          window.localStorage.setItem(k, value);
        }
      }
    });
  };
}