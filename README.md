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
📃 rollup.config.js
📃 tsconfig.json
📃 package.json
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
      this.$message.innerText = this.message;
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

- `normalizeInteger` - Wrapper for `parseInt(value, 10)`.
- `normalizeFloat` - Wrapper for `parseFloat(value)`.
- `normalizeBoolean` - Handles `bool` type including string `'true'` / `'false'`.
- `normalizeString` - Wrapper for `` `${value}` ``.

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
  <parent/> <!-- <div>Default!</div> -->
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

### `@Local(initialValue[, key])`

To access localStorage values bind them to a class level property.

```js
// Default to 42
@Local('42') foo;
// Default to 42 and share a global key
@Local('42', 'sharedKeyName') foo;
```

## Development

```
# Build
npm run build
# View files in dist/
# Then link for use locally
npm link
# Within a local project directory
npm link @pictogrammers/element
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
