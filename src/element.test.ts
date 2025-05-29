import { describe, expect, test, jest } from '@jest/globals';

import { Component, Prop } from "./element"

describe("createElement", () => {

  @Component({
    selector: 'hello-world',
    template: '<span part="count"></span>'
  })
  class HelloWorld extends HTMLElement {
    @Prop() count: number = 0;
  }

  test("basic", () => {
    const ele = document.createElement('hello-world') as HelloWorld;
    expect(ele.count).toBe(0);
  });
});