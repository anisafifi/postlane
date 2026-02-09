import 'multer';

declare module 'multer' {
  namespace Multer {
    interface File {
      buffer: Buffer;
    }
  }
}
