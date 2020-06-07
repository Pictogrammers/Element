# Element

Simple TypeScript wrapper for creating a Web Component.

```bash
npm install @mdi/element
```

Example Usage: [MaterialDesign-Components](https://github.com/Templarian/MaterialDesign-Components)

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
import { Component, Prop, Part } from '@mdi/element';

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
[part~=message] {
  /* Style Part */
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
import { Component, Prop, Part } from '@mdi/element';
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
[part~=button] {
  border-radius: 0.25rem;
  border: #ddd;
  color: #222;
}
```

### `@Local(initialValue[, key])`

To access localStorage values bind them to variable.

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
npm link @mdi/element
```
