import { Directive, EmbeddedViewRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, TemplateRef, ViewContainerRef } from '@angular/core';
import { isObservable, Observable, SubscriptionLike } from 'rxjs';

type ObservableOrPromise<T> = Observable<T> | Promise<T>;

interface AsyncContext {
  $implicit: any;
}

interface SubscriptionStrategy {
  createSubscription(async: ObservableOrPromise<any>, next: any, error: any, complete: any): SubscriptionLike | Promise<any>;

  dispose(subscription: SubscriptionLike | Promise<any>): void;
}

class ObservableStrategy implements SubscriptionStrategy {
  createSubscription(async: ObservableOrPromise<any>, next: any, error: any, complete: any): SubscriptionLike {
    return async.subscribe(next, error, complete);
  }

  dispose(subscription: SubscriptionLike): void {
    if (subscription) {
      subscription.unsubscribe();
    }
  }
}

class PromiseStrategy implements SubscriptionStrategy {
  createSubscription(async: Observable<any> | Promise<any>, next: any, error: any, complete: any): Promise<any> {
    return async.then(next, error).finally(complete);
  }

  dispose(subscription: Promise<any>): void {}
}

const observableStrategy = new ObservableStrategy();
const promiseStrategy = new PromiseStrategy();

function resolveStrategy(async: ObservableOrPromise<any>): SubscriptionStrategy {
  if (isObservable(async)) {
    return observableStrategy;
  }

  if (isPromise(async)) {
    return promiseStrategy;
  }

  throw new Error(`InvalidDirectiveArgument: 'async' for directive 'async'`);
}

@Directive({ selector: '[async]' })
export class AsyncDirective implements OnChanges, OnDestroy {

  @Input() async: ObservableOrPromise<any>;
  @Input() asyncFrom: ObservableOrPromise<any>;
  @Input() asyncNext: any;
  @Input() asyncError: any;
  @Input() asyncComplete: any;

  @Output() next: EventEmitter<any> = new EventEmitter<any>();
  @Output() error: EventEmitter<any> = new EventEmitter<any>();
  @Output() complete: EventEmitter<any> = new EventEmitter<any>();

  private context: AsyncContext = { $implicit: null };
  private viewRef: EmbeddedViewRef<AsyncContext> =
    this.viewContainer.createEmbeddedView(this.templateRef, this.context);

  private strategy: SubscriptionStrategy;
  private subscription: SubscriptionLike | Promise<any>;

  constructor(
    private templateRef: TemplateRef<AsyncContext>,
    private viewContainer: ViewContainerRef
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if ('async' in changes) {
      this.onAsyncDidChanged(this.async, changes.async.previousValue);
    }
    if ('asyncFrom' in changes) {
      this.onAsyncDidChanged(this.asyncFrom, changes.asyncFrom.previousValue);
    }
  }

  ngOnDestroy() {
    this.dispose();
  }

  private onAsyncDidChanged(current: ObservableOrPromise<any>, previous: ObservableOrPromise<any>): void {
    if (!this.subscription) {
      return current && this.subscribe(current);
    }

    if (current !== previous) {
      this.dispose();
      return this.onAsyncDidChanged(current, null);
    }
  }

  private subscribe(async: ObservableOrPromise<async>) {
    this.strategy = resolveStrategy(async);
    this.subscription = this.strategy.createSubscription(
      async,
      (value: any) => this.onNext(value),
      (value: any) => this.onError(value),
      (value: any) => this.onComplete(value)
    );
  }

  private onNext(value: any): void {
    this.context.$implicit = value;
    this.next.emit(value);
    if (isFunction(this.asyncNext)) {
      this.asyncNext(value);
    }
    this.viewRef.markForCheck();
  }

  private onError(value: any): void {
    this.error.emit(value);
    if (isFunction(this.asyncError)) {
      this.asyncError(value);
    }
  }

  private onComplete(value: any): void {
    this.complete.next(value);
    if (isFunction(this.asyncComplete)) {
      this.asyncComplete(value);
    }
  }

  private dispose(): void {
    if (this.strategy) {
      this.strategy.dispose(this.subscription);
      this.subscription = null;
      this.strategy = null;
    }
  }

}

function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

function isPromise<T>(value: any): value is Promise<T> {
  return value && typeof value.subscribe !== 'function' && typeof value.then === 'function';
}