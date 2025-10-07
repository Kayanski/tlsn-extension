import { HTTPParser } from 'http-parser-js';



export type Interval = { start: number, end: number }

export type DistanceAndEnd = {
  distance: number,
  end: number
}


export function byteOffsetToStringOffset(bytes: Buffer, byteOffset: number) {
  const decoder = new TextDecoder();

  // Take only the bytes up to the target offset
  const fullBytes = Uint8Array.from(bytes);
  const bytesUpToOffset = fullBytes.slice(0, byteOffset);

  // Decode back to string to get character count
  const substring = decoder.decode(bytesUpToOffset);

  return substring.length;
}

export function parseHttpMessage(buffer: Buffer, type: 'request' | 'response') {
  const parser = new HTTPParser(
    type === 'request' ? HTTPParser.REQUEST : HTTPParser.RESPONSE,
  );
  const body: Buffer[] = [];
  const bytesBodyOffsets: Interval[] = [];
  let complete = false;
  let headers: string[] = [];

  parser.onBody = (t, offset, length) => {
    //@ts-ignore
    bytesBodyOffsets.push({ start: parser.offset, end: parser.offset + length });
    body.push(t);
  };

  parser.onHeadersComplete = (res) => {
    headers = res.headers;
  };

  parser.onMessageComplete = () => {
    complete = true;
  };

  parser.execute(buffer);
  parser.finish();

  if (!complete) throw new Error(`Could not parse ${type.toUpperCase()}`);

  const bodyOffsets = bytesBodyOffsets.map(({ start, end }) => ({ start: byteOffsetToStringOffset(buffer, start), end: byteOffsetToStringOffset(buffer, end) }));

  return {
    info: buffer.toString('utf-8').split('\r\n')[0],
    headers,
    body,
    bodyOffsets,
    bytesBodyOffsets,
  };
}
