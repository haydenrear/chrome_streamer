import {injectable} from 'inversify';

export interface Subscriber<T> {

    doNext: (value: T) => void;

}

export interface Publisher<T, S extends Subscriber<T>> {

    subscribe: (subscriber: S) => void;

    nextValue: (nextValue: T) => void;

}


@injectable()
export abstract class AbstractPublisher<T, S extends Subscriber<T>> implements Publisher<T, S>{

    protected subscribers: Array<S>;

    constructor() {
        this.subscribers = [];
    }

    public subscribe(subscriber: S) {
        this.subscribers.push(subscriber);
    }

    public nextValue(nextValue: T) {
      this.subscribers.forEach(sub => sub.doNext(nextValue));
    }
}
