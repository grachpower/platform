import { Component } from '@angular/core';
import { createHostComponentFactory, SpectatorWithHost } from '@netbasal/spectator';
import { InitDirective } from '../../lib/directives/init.directive';

@Component({ selector: 'host', template: '' })
class HostComponent {
  example: string;
}

const VALUE_THROUGH_BINDING = 'value through binding';
const VALUE_IN_TEMPLATE = 'value in template';

describe('InitDirective', () => {
  let host: SpectatorWithHost<InitDirective, HostComponent>;
  const create = createHostComponentFactory({
    component: InitDirective,
    host: HostComponent
  });

  describe('using letOf', () => {
    it('should create variable through template', () => {
      host = create(`<ng-container *init="let variable of '${VALUE_IN_TEMPLATE}'">{{ variable }}</ng-container>`);

      expect(host.hostElement).toHaveText(VALUE_IN_TEMPLATE);
    });

    it('should create variable through binding', () => {
      host = create(`<ng-container *init="let variable of example">{{ variable }}</ng-container>`);

      expect(host.hostElement).not.toHaveText(VALUE_THROUGH_BINDING);

      host.setHostInput({ example: VALUE_THROUGH_BINDING });
      expect(host.hostElement).toHaveText(VALUE_THROUGH_BINDING);
    });
  });

  describe('using as', () => {
    it('should create variable through template', () => {
      host = create(`<ng-container *init="'${VALUE_IN_TEMPLATE}' as variable">{{ variable }}</ng-container>`);

      expect(host.hostElement).toHaveText(VALUE_IN_TEMPLATE);
    });

    it('should create variable through binding', () => {
      host = create(`<ng-container *init="example as variable">{{ variable }}</ng-container>`);

      expect(host.hostElement).not.toHaveText(VALUE_THROUGH_BINDING);

      host.setHostInput({ example: VALUE_THROUGH_BINDING });
      expect(host.hostElement).toHaveText(VALUE_THROUGH_BINDING);
    });
  });

});
