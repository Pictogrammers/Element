import { describe, expect, test, beforeEach, afterEach } from 'vitest';

import {
  Component, Prop, Part, forEach,
  getProps, selectComponent,
} from "./element";

describe("forEach", () => {

  const HELLO_ITEM = 'hello-item';

  @Component({
    selector: HELLO_ITEM,
    template: '<span part="count"></span>'
  })
  class HelloItem extends HTMLElement {
    @Prop() index: number;
    @Prop() count: number = 0;
    @Part() $count: HTMLSpanElement;

    render() {
      this.$count.textContent = `${this.count}`;
    }
  }

  const HELLO_WORLD = 'hello-world';

  @Component({
    selector: HELLO_WORLD,
    template: '<div part="list"></div>'
  })
  class HelloWorld extends HTMLElement {
    @Prop() items: any[] = [];
    @Part() $list: HTMLDivElement;

    connectedCallback() {
      forEach({
        container: this.$list,
        items: this.items,
        type() {
          return HelloItem;
        }
      })
    }
  }

  beforeEach(() => {
    var c = document.createElement(HELLO_WORLD);
    document.body.appendChild(c);
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  test('should be registered', () => {
    expect(customElements.get(HELLO_ITEM)).toBeDefined();
    expect(customElements.get(HELLO_WORLD)).toBeDefined();
  });

  test("initial render", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $list } = component;
    expect($list.children.length).toBe(0);
  });

  test("items.fill", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $list } = component;
    component.items = [{ count: 1, bar: 'hmm' }];
    expect($list.children.length).toBe(1);
    const item = $list.children[0] as HelloItem;
    expect(item.$count.textContent).toBe('1');
    component.items.fill({ count: 2, foo: 'hmm' });
    expect($list.children.length).toBe(1);
    expect(item.$count.textContent).toBe('2');
    expect(($list.children[0] as HelloItem).index).toBe(0);
  });

  test("items.pop", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $list } = component;
    component.items = [{ count: 1 }, { count: 2 }];
    expect($list.children.length).toBe(2);
    expect(($list.children[0] as HelloItem).index).toBe(0);
    expect(($list.children[1] as HelloItem).index).toBe(1);
    component.items.pop();
    expect($list.children.length).toBe(1);
    expect(($list.children[0] as HelloItem).count).toBe(1);
    expect(($list.children[0] as HelloItem).index).toBe(0);
  });

  test("items.push", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $list } = component;
    component.items = [{ count: 9 }];
    expect($list.children.length).toBe(1);
    expect(($list.children[0] as HelloItem).count).toBe(9);
    expect(($list.children[0] as HelloItem).index).toBe(0);
    component.items.push({ count: 1 });
    expect($list.children.length).toBe(2);
    expect(($list.children[0] as HelloItem).count).toBe(9);
    expect(($list.children[1] as HelloItem).count).toBe(1);
    expect(($list.children[0] as HelloItem).index).toBe(0);
    expect(($list.children[1] as HelloItem).index).toBe(1);
  });

  test("items.shift", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $list } = component;
    component.items = [{ count: 1 }, { count: 2 }];
    expect($list.children.length).toBe(2);
    component.items.shift();
    expect($list.children.length).toBe(1);
    expect(($list.children[0] as HelloItem).count).toBe(2);
    expect(($list.children[0] as HelloItem).index).toBe(0);
  });

  test("items.unshift", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $list } = component;
    component.items = [{ count: 9 }];
    expect($list.children.length).toBe(1);
    component.items.unshift({ count: 1 });
    expect($list.children.length).toBe(2);
    expect(($list.children[0] as HelloItem).count).toBe(1);
    expect(($list.children[1] as HelloItem).count).toBe(9);
    expect(($list.children[0] as HelloItem).index).toBe(0);
    expect(($list.children[1] as HelloItem).index).toBe(1);
  });

  test("items.splice", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $list } = component;
    component.items = [{ count: 6 }, { count: 7 }, { count: 9 }];
    expect($list.children.length).toBe(3);
    component.items.splice(1, 1, { count: 77 }, { count: 88 });
    expect($list.children.length).toBe(4);
    expect(($list.children[0] as HelloItem).count).toBe(6);
    expect(($list.children[1] as HelloItem).count).toBe(77);
    expect(($list.children[2] as HelloItem).count).toBe(88);
    expect(($list.children[3] as HelloItem).count).toBe(9);
    expect(($list.children[0] as HelloItem).index).toBe(0);
    expect(($list.children[1] as HelloItem).index).toBe(1);
    expect(($list.children[2] as HelloItem).index).toBe(2);
    expect(($list.children[3] as HelloItem).index).toBe(3);
  });

  test("items.sort", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    const { $list } = component;
    component.items = [{ count: 3 }, { count: 1 }, { count: 2 }];
    expect($list.children.length).toBe(3);
    component.items.sort((a: any, b: any) => a.count - b.count);
    expect($list.children.length).toBe(3);
    expect(($list.children[0] as HelloItem).count).toBe(1);
    expect(($list.children[1] as HelloItem).count).toBe(2);
    expect(($list.children[2] as HelloItem).count).toBe(3);
    expect(($list.children[0] as HelloItem).index).toBe(0);
    expect(($list.children[1] as HelloItem).index).toBe(1);
    expect(($list.children[2] as HelloItem).index).toBe(2);
  });

  test("items.push item reactivity", () => {
    const component = selectComponent<HelloWorld>(HELLO_WORLD);
    component.items.push({ count: 0 });
    const { $list } = component;
    component.items[0].count = 2;
    const firstItem = $list.children[0] as HelloItem;
    expect(firstItem.count).toBe(2);
    expect(firstItem.index).toBe(0);
    const { $count } = firstItem;
    expect($count.textContent).toBe('2');
  });

});

describe("forEach null type", () => {

  const HELLO_NULL_ITEM = 'hello-null-item';

  @Component({
    selector: HELLO_NULL_ITEM,
    template: '<span part="count"></span>'
  })
  class HelloNullItem extends HTMLElement {
    @Prop() index: number;
    @Prop() count: number = 0;
    @Part() $count: HTMLSpanElement;

    render() {
      this.$count.textContent = `${this.count}`;
    }
  }

  const HELLO_NULL_WORLD = 'hello-null-world';

  @Component({
    selector: HELLO_NULL_WORLD,
    template: '<div part="list"></div>'
  })
  class HelloNullWorld extends HTMLElement {
    @Prop() items: any[] = [];
    @Part() $list: HTMLDivElement;

    connectedCallback() {
      forEach({
        container: this.$list,
        items: this.items,
        type(item) {
          return item.hidden ? null : HelloNullItem;
        }
      });
    }
  }

  beforeEach(() => {
    var c = document.createElement(HELLO_NULL_WORLD);
    document.body.appendChild(c);
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  test('initial render skips null-typed items', () => {
    const component = selectComponent<HelloNullWorld>(HELLO_NULL_WORLD);
    const { $list } = component;
    component.items = [{ count: 1 }, { count: 2, hidden: true }, { count: 3 }];
    expect($list.children.length).toBe(2);
    expect(($list.children[0] as HelloNullItem).count).toBe(1);
    expect(($list.children[1] as HelloNullItem).count).toBe(3);
    expect(($list.children[0] as HelloNullItem).index).toBe(0);
    expect(($list.children[1] as HelloNullItem).index).toBe(1);
  });

  test('indices are contiguous among rendered items', () => {
    const component = selectComponent<HelloNullWorld>(HELLO_NULL_WORLD);
    const { $list } = component;
    component.items = [
      { count: 1 },
      { count: 2, hidden: true },
      { count: 3 },
      { count: 4, hidden: true },
      { count: 5 },
    ];
    expect($list.children.length).toBe(3);
    expect(($list.children[0] as HelloNullItem).index).toBe(0);
    expect(($list.children[1] as HelloNullItem).index).toBe(1);
    expect(($list.children[2] as HelloNullItem).index).toBe(2);
  });

  test('push of null-typed item does not render', () => {
    const component = selectComponent<HelloNullWorld>(HELLO_NULL_WORLD);
    const { $list } = component;
    component.items = [{ count: 1 }];
    expect($list.children.length).toBe(1);
    component.items.push({ count: 2, hidden: true });
    expect($list.children.length).toBe(1);
    component.items.push({ count: 3 });
    expect($list.children.length).toBe(2);
    expect(($list.children[1] as HelloNullItem).count).toBe(3);
    expect(($list.children[1] as HelloNullItem).index).toBe(1);
  });

  test('pop of null-typed last item does not remove from DOM', () => {
    const component = selectComponent<HelloNullWorld>(HELLO_NULL_WORLD);
    const { $list } = component;
    component.items = [{ count: 1 }, { count: 2, hidden: true }];
    expect($list.children.length).toBe(1);
    component.items.pop();
    expect($list.children.length).toBe(1);
    expect(($list.children[0] as HelloNullItem).count).toBe(1);
  });

  test('pop of rendered last item removes it from DOM', () => {
    const component = selectComponent<HelloNullWorld>(HELLO_NULL_WORLD);
    const { $list } = component;
    component.items = [{ count: 1, hidden: true }, { count: 2 }];
    expect($list.children.length).toBe(1);
    component.items.pop();
    expect($list.children.length).toBe(0);
  });

  test('shift of null-typed first item does not change DOM', () => {
    const component = selectComponent<HelloNullWorld>(HELLO_NULL_WORLD);
    const { $list } = component;
    component.items = [{ count: 1, hidden: true }, { count: 2 }];
    expect($list.children.length).toBe(1);
    component.items.shift();
    expect($list.children.length).toBe(1);
    expect(($list.children[0] as HelloNullItem).count).toBe(2);
    expect(($list.children[0] as HelloNullItem).index).toBe(0);
  });

  test('splice removing null-typed item does not change DOM', () => {
    const component = selectComponent<HelloNullWorld>(HELLO_NULL_WORLD);
    const { $list } = component;
    component.items = [{ count: 1 }, { count: 2, hidden: true }, { count: 3 }];
    expect($list.children.length).toBe(2);
    component.items.splice(1, 1);
    expect($list.children.length).toBe(2);
    expect(($list.children[0] as HelloNullItem).count).toBe(1);
    expect(($list.children[1] as HelloNullItem).count).toBe(3);
  });

});

describe("forEach nested", () => {

  const HELLO_RECURSIVE = 'hello-recursive';

  @Component({
    selector: HELLO_RECURSIVE,
    template: '<div part="label"></div><div part="list"></div>'
  })
  class HelloRecursive extends HTMLElement {
    @Prop() label: string = '';
    @Prop() items: any[] = [];

    @Part() $label: HTMLDivElement;
    @Part() $list: HTMLDivElement;

    connectedCallback() {
      forEach({
        container: this.$list,
        items: this.items,
        type() {
          return HelloRecursive;
        }
      })
    }

    render(changes: any) {
      if (changes.label) {
        this.$label.textContent = this.label;
      }
    }
  }

  beforeEach(() => {
    var c = document.createElement(HELLO_RECURSIVE);
    document.body.appendChild(c);
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  test('should be registered', () => {
    expect(customElements.get(HELLO_RECURSIVE)).toBeDefined();
  });

  test("items with nested items", () => {
    const component = selectComponent<HelloRecursive>(HELLO_RECURSIVE);
    const { $list } = component;
    component.items = [{
      label: 'Item 1',
      items: [{ label: 'Sub Item' }]
    }];
    expect($list.children.length).toBe(1);
    const { $list: $subList } = $list.children[0] as HelloRecursive;
    expect($subList.children.length).toBe(1);
    component.items[0].items[0].label = 'updated sub item';
    const { $label: $subLabel } = $subList.children[0] as HelloRecursive;
    expect($subLabel.textContent).toBe('updated sub item');
  });

});

describe("forEach double binding", () => {

  const HELLO_MULTI_ITEM = 'hello-multi-item';

  @Component({
    selector: HELLO_MULTI_ITEM,
    template: '<div part="label"></div>'
  })
  class HelloMultiItem extends HTMLElement {
    @Prop() label: string = '';

    @Part() $label: HTMLDivElement;

    render(changes: any) {
      if (changes.label) {
        this.$label.textContent = this.label;
      }
    }
  }

  const HELLO_MULTI = 'hello-multi';

  @Component({
    selector: HELLO_MULTI,
    template: '<div part="list"></div>'
  })
  class HelloMulti extends HTMLElement {
    @Prop() items: any[] = [];

    @Part() $list: HTMLDivElement;

    connectedCallback() {
      forEach({
        container: this.$list,
        items: this.items,
        type() {
          return HelloMultiItem;
        }
      });
    }
  }

  beforeEach(() => {
    var c1 = document.createElement(HELLO_MULTI);
    document.body.appendChild(c1);
    var c2 = document.createElement(HELLO_MULTI);
    document.body.appendChild(c2);
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  test('should be registered', () => {
    expect(customElements.get(HELLO_MULTI)).toBeDefined();
    expect(customElements.get(HELLO_MULTI_ITEM)).toBeDefined();
  });

  test("bind the same data to 2 components", () => {
    const singleton = [{
      label: 'Hello World 1!'
    }];
    const components = Array.from(document.querySelectorAll(HELLO_MULTI)) as HelloMulti[];
    const c1 = components[0];
    const c2 = components[1];
    c1.$list.dataset.test = 'first';
    c2.$list.dataset.test = 'second';
    components.forEach((component) => {
      component.items = singleton;
    });
    // Verify item rendered
    const c1_1 = c1.$list.children[0] as HelloMultiItem;
    expect(c1_1.$label.textContent).toBe('Hello World 1!');
    const c2_1 = c2.$list.children[0] as HelloMultiItem;
    expect(c2_1.$label.textContent).toBe('Hello World 1!');
    // Push 1 more item
    c1.items.push({
      label: 'Hello World 2!'
    });
    // Verify rendered new item
    const c1_2 = c1.$list.children[1] as HelloMultiItem;
    expect(c1_2.$label.textContent).toBe('Hello World 2!');
    const c2_2 = c2.$list.children[1] as HelloMultiItem;
    expect(c2_2.$label.textContent).toBe('Hello World 2!');
  });

});

describe("forEach id alias", () => {

  const HELLO_ID_ITEM = 'hello-id-item';

  @Component({
    selector: HELLO_ID_ITEM,
    template: '<span part="label"></span>'
  })
  class HelloIdItem extends HTMLElement {
    @Prop() index: number;
    @Prop() itemId: string = '';
    @Prop() label: string = '';
    @Part() $label: HTMLSpanElement;

    render(changes: any) {
      if (changes.label) {
        this.$label.textContent = this.label;
      }
    }
  }

  const HELLO_ID_WORLD = 'hello-id-world';

  @Component({
    selector: HELLO_ID_WORLD,
    template: '<div part="list"></div>'
  })
  class HelloIdWorld extends HTMLElement {
    @Prop() items: any[] = [];
    @Part() $list: HTMLDivElement;

    connectedCallback() {
      forEach({
        container: this.$list,
        items: this.items,
        type() { return HelloIdItem; }
      });
    }
  }

  beforeEach(() => {
    document.body.appendChild(document.createElement(HELLO_ID_WORLD));
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  test('data `id` maps to component `itemId` on initial render', () => {
    const component = selectComponent<HelloIdWorld>(HELLO_ID_WORLD);
    component.items = [{ id: 'abc', label: 'Hello' }];
    const item = component.$list.children[0] as HelloIdItem;
    expect(item.itemId).toBe('abc');
    expect(item.label).toBe('Hello');
  });

  test('data `id` maps to component `itemId` on push', () => {
    const component = selectComponent<HelloIdWorld>(HELLO_ID_WORLD);
    component.items.push({ id: 'xyz', label: 'World' });
    const item = component.$list.children[0] as HelloIdItem;
    expect(item.itemId).toBe('xyz');
  });

  test('reactive update to data `id` propagates to component `itemId`', () => {
    const component = selectComponent<HelloIdWorld>(HELLO_ID_WORLD);
    component.items = [{ id: 'foo', label: 'Test' }];
    const item = component.$list.children[0] as HelloIdItem;
    expect(item.itemId).toBe('foo');
    component.items[0].id = 'bar';
    expect(item.itemId).toBe('bar');
  });

  test('fill with `id` updates component `itemId`', () => {
    const component = selectComponent<HelloIdWorld>(HELLO_ID_WORLD);
    component.items = [{ id: 'a', label: 'first' }];
    component.items.fill({ id: 'b', label: 'second' });
    const item = component.$list.children[0] as HelloIdItem;
    expect(item.itemId).toBe('b');
    expect(item.label).toBe('second');
  });

  test('explicit `itemId` in data takes precedence over aliased `id`', () => {
    const component = selectComponent<HelloIdWorld>(HELLO_ID_WORLD);
    component.items = [{ id: 'ignored', itemId: 'explicit', label: 'Test' }];
    const item = component.$list.children[0] as HelloIdItem;
    expect(item.itemId).toBe('explicit');
  });

});
