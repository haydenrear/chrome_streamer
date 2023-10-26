import {injectable, unmanaged} from 'inversify';
import {capitalize} from '../utils/ioUtils';


@injectable()
export class InjectableProperties {
  constructor(@unmanaged() propertyNames: string[]) {
    propertyNames.forEach(p => {
      let s = p.toLowerCase();
      let number = s.split("_");
      const propName = number
        .map((v, i) => {
          if (i == 0) {
            return v;
          } else {
            return capitalize(v);
          }
        })
        .filter(f => f !== undefined)
        .join("");
      this[propName] = (import.meta.env[`VITE_${p}`] as string)
    });
  }

}

@injectable()
export class EventListenerProperties extends InjectableProperties {

  constructor() {
    super(["EVENT_LISTENER_LOG", "OUT_DIRECTORY"])
  }

}


