const OUTPUT_DIRECTORY = 'klex-exports';

type TemporaryStorage = Pick<StorageManager, 'getDirectory'>;

export class TemporaryStorageUnavailableError extends Error {
  constructor() {
    super('Origin private file system storage is unavailable.');
  }
}

export type TemporaryOutput = {
  handle: FileSystemFileHandle;
  dispose: () => Promise<void>;
};

export async function createTemporaryOutput(
  storage: TemporaryStorage | undefined = typeof navigator === 'undefined' ? undefined : navigator.storage,
  id: string = crypto.randomUUID(),
): Promise<TemporaryOutput> {
  if (!storage || typeof storage.getDirectory !== 'function') {
    throw new TemporaryStorageUnavailableError();
  }

  let root: FileSystemDirectoryHandle;
  try {
    root = await storage.getDirectory();
  } catch {
    throw new TemporaryStorageUnavailableError();
  }

  let directory: FileSystemDirectoryHandle;
  let handle: FileSystemFileHandle;
  const name = `export-${id}.mp4`;
  try {
    directory = await root.getDirectoryHandle(OUTPUT_DIRECTORY, { create: true });
    handle = await directory.getFileHandle(name, { create: true });
  } catch {
    throw new TemporaryStorageUnavailableError();
  }
  let disposed = false;
  let disposal: Promise<void> | undefined;

  return {
    handle,
    async dispose() {
      if (disposed) return;
      disposal ??= (async () => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          try {
            await directory.removeEntry(name);
            disposed = true;
            return;
          } catch (cause) {
            if (cause instanceof DOMException && cause.name === 'NotFoundError') {
              disposed = true;
              return;
            }
            if (attempt === 5) throw cause;
            await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** attempt));
          }
        }
      })().catch((cause) => {
        disposal = undefined;
        throw cause;
      });
      await disposal;
    },
  };
}
