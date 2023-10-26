import * as path from 'path';

export function createStream(value: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      return pump();

      function pump() {
        controller.enqueue(new Buffer(value));
      }
    },
  });
}

export function createPath(directory: string, id: string, ext: string = 'webm') {
  return path.join(directory, `${id}.${ext}`);
}

export function capitalize(toCapitalize: string | undefined): string | undefined {
  if (!toCapitalize) {
    return undefined;
  } else if (toCapitalize.length == 1) {
    return toCapitalize;
  } else {
    const toCapitalizeStart = toCapitalize.charAt(0).toUpperCase();
    const rest = toCapitalize.substring(1);
    return toCapitalizeStart.concat(rest);
  }
}
