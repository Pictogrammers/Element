# Element

Simple TypeScript wrapper for creating a Web Component.

```bash
npm install @pictogrammers/element
```

Example Usage: [Element-Hello-World](https://github.com/Pictogrammers/Element-Hello-World)

## Basics

To make things easier setup the project assuming the custom element `<hello-world message="Hello World!"></hello-world>`.

```
📂 src/
  📂 hello/
    📂 world/
      📃 world.ts
      📃 world.html
      📃 world.css
📃 jest.config.json
📃 package.json
📃 tsconfig.json
📃 webpack.config.js
```

### Class (`world.ts`)

```typescript
import { Component, Prop, Part } from '@pictogrammers/element';

import template from "./world.html";
import style from './world.css';

@Component({
  selector: 'hello-world',
  style,
  template
})
export default class HelloWorld extends HTMLElement {
  @Prop() message = 'Hello World';
  
  @Part() $message: HTMLDivElement;
  
  render(changes) {
    if (changes.message) {
      this.$message.textContent = this.message;
    }
  }
}
```

### Template (`world.html`)

```html
<div part="message">Default!</div>
```

### CSS Styles (`world.css`)

```css
:host {
  display: block;
}
[part=message] {
  /* Style Part */
}
```

### Normalizing Props

It is recommended to use primitives for props where possible. To make this easier functions are provided to normalize values for booleans, integers, numbers, and strings.

```typescript
import { Component, Prop, normalizeBoolean } from '@pictogrammers/element';
// ...
@Prop(normalizeBoolean) selected = false;
```

Which is equivalent to...

```typescript
import { Component, Prop, normalizeBoolean } from '@pictogrammers/element';
// ...
#selected = false;
@Prop()
get selected() {
  return this.#selected;
}
set selected(value: string | boolean) {
  this.#selected = normalizeBoolean(value);
}
```

> **Note:** Instead of ever using `get` / `set` always use the `render` method for managing changes to prevent unncessary operations.

- `normalizeInt` - Wrapper for ``parseInt(`${value}`, 10)``.
- `normalizeFloat` - Wrapper for ``parseFloat(`${value}`)``.
- `normalizeBoolean` - Handles `bool` type including string `'true'` / `'false'`.
- `normalizeString` - Wrapper for `` `${value}` ``.

### Template Loops

Components can create repeated lists of other components by using the `forEach` utility. Any updates will sync values to the component provided in the type function.

> **Note:** `item` will automatically be added to 

```typescript
import { forEach } from '@pictogrammers/element';

import UiItem from 'ui/item';

// ... in element class

  // Public
  @Prop() options: any[] = [];
  // Private
  @Prop() #options: any[] = [];

  connectedCallback() {
    forEach({
      container: this.$items,
      items: this.options,
      type(item) {
        return UiItem;
      },
      create($item, item) {
        // after creation of $item element
      },
      connect($item, item, $items) {
        // after connectedCallback
      },
      disconnect($item, item, $items) {
        // before disconnectedCallback
      },
      update($item, item, $items) {
        // after every $item update
      },
      minIndex(items) {
        return 0; // start range to monitor node changes
      },
      maxIndex(items) {
        return items.length; // end range to monitor node changes
      }
    });
  }
```

### Methods

Components can have methods for performing actions. For instance validating or resetting a form.

```typescript
import { Component } from '@pictogrammers/element';

@Component({
  selector: 'hello-world'
})
export default class HelloWorld extends HTMLElement {
  method(arg) {
    // code
  }

  #privateMethod(arg) {
    // not accessible
  }
}
```

## Advanced

Starting with a simple component can allow one to extend it with more features later on. This can be done by extending components.

```
📂 src/
  📂 hello/
    📂 world/
      📃 world.ts
      📃 world.html
      📃 world.css
    📂 worldButton/
      📃 worldButton.ts
      📃 worldButton.html
      📃 worldButton.css
```

### TypeScript (`worldButton.ts`)

```typescript
import { Component, Prop, Part } from '@pictogrammers/element';
import HelloWorld from '../world/world';

import style from './worldButton.css';
import template from './worldButton.html';

@Component({
  selector: 'hello-world-button',
  style,
  template
})
export default class HelloWorldButton extends HelloWorld {
  @Part() $button: HTMLButtonElement;

  renderCallback() {
    this.$button.addEventListener('click', () => {
      alert(this.message);
    });
  }
}
```

### Template (`worldButton.html`)

```html
<button part="button">
  <parent /> <!-- <div>Default!</div> -->
</button>
```

### CSS Styles (`worldButton.css`)

```css
[part=button] {
  border-radius: 0.25rem;
  border: #ddd;
  color: #222;
}
```

### `@Local(key: string)`

To access `localStorage` values bind them to a class level property with a `Map` type.

```js
// store:toggle
@Local('store') store = new Map([
  ['toggle', false]
]);
// Caches to a private property
@Local('store') #store = new Map([
  ['someobj', null]
]);

// somehere in your code
this.store.get('toggle');
this.store.set('toggle' true);
```

## Development

```bash
# Build
npm run build
# View files in dist/
# Then link for use locally
npm link
# Within a local project directory
npm link @pictogrammers/element
```

After making changes run build.

```bash
npm run build
```

Always run tests before submitting any updates.

```bash
npm test
```

## Utility Base Class

Some other notes about unique use cases that are handled.

### Optional `Component()` Config

Utility base classes can be defined without a config. These are rarely used, but are supported.

```typescript
import { Component } from '@pictogrammers/element';

@Component()
export default class HelloOverlay extends HtmlElement {
  static open() {

  }

  close() {

  }
}
```

## Jest Utils

- `selectComponent<T>(tag: string): T`
- `selectPart<T>(component: HTMLElement, name: string): T`
- `getProps(tag: string): string[]`

### Basic

```typescript
import { selectComponent, getProps } from '@pictogrammers/element';

import './world';
import HelloWorld from './world';

const HELLO_WORLD = 'hello-world';

describe('hello-world', () => {

  const DEFAULT_MESSAGE = 'None';

  beforeEach(() => {
    var c = document.createElement(HELLO_WORLD);
    document.body.appendChild(c);
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should be registered', () => {
    expect(customElements.get(HELLO_WORLD)).toBeDefined();
  });

  it('should only expose known props', () => {
    const props = getProps(HELLO_WORLD);
    expect(props.length).toBe(2);
    expect(props).toContain('message');
    expect(props).toContain('count');
  });

});
```
