import { describe, expect, test, jest } from '@jest/globals';

import { Component, Prop, Part } from "./element"

describe("createElement", () => {

  @Component({
    selector: 'hello-world',
    template: '<span part="count"></span>'
  })
  class HelloWorld extends HTMLElement {
    @Prop() count: number = 0;
    @Part() $count: HTMLSpanElement;

    render() {
      this.$count.textContent = `${this.count}`;
    }
  }

  test("basic", () => {
    const ele = document.createElement('hello-world') as HelloWorld;
    document.body.append(ele);
    expect(ele.count).toBe(0);
    expect(ele.shadowRoot?.innerHTML).toBe('<span part="count">0</span>');
    ele.remove();
  });

  test("basic template render", () => {
    const ele = document.createElement('hello-world') as HelloWorld;
    document.body.append(ele);
    ele.count = 1;
    expect(ele.count).toBe(1);
    expect(ele.shadowRoot?.innerHTML).toBe('<span part="count">1</span>');
    ele.remove();
  });

});
