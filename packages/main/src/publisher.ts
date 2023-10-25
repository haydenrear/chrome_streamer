export interface Subscriber<T> {

    doNext: (value: T) => void;

}

export class Publisher<T, S extends Subscriber<T>> {

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
