import path from 'path';
import {
  NodeSSH,
  SSHGetPutDirectoryOptions,
  SSHPutFilesOptions,
} from 'node-ssh';

const ssh = new NodeSSH();

interface IPayloadPutDir {
  fromPath: string;
  toPath: string;
  options: SSHGetPutDirectoryOptions;
}
interface IReturnPutDir {
  success: boolean;
  failed: string[];
  successful: string[];
}
export const putDirectory = async ({
  fromPath,
  toPath,
  options,
}: IPayloadPutDir): Promise<IReturnPutDir> => {
  const failed: string[] = [];
  const successful: string[] = [];
  const success = await ssh.putDirectory(fromPath, toPath, {
    recursive: true,
    concurrency: 10,
    validate(itemPath) {
      const baseName = path.basename(itemPath);
      return baseName !== 'node_modules';
    },
    tick(localPath, remotePath, error) {
      if (error) {
        failed.push(localPath);
      } else {
        successful.push(localPath);
      }
    },
    ...(options || {}),
  });
  // eslint-disable-next-line no-console
  console.log(
    `transfer was ${
      success ? 'successful' : 'unsuccessful'
    }: [${fromPath} => ${toPath}]`
  );
  console.log('failed transfers', failed.join(', '));
  console.log('successful transfers', successful.join(', '));
  return {
    success,
    failed,
    successful,
  };
};
export type TPutDirectory = typeof putDirectory;

export const putFiles = async (
  files: { local: string; remote: string }[],
  opts?: SSHPutFilesOptions
): Promise<void> => {
  return ssh.putFiles(files, opts);
};
export type TPutFiles = typeof putFiles;

interface IConnectConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

export const connect = async (config: IConnectConfig): Promise<void> => {
  await ssh.connect(config);
};
export type TConnect = typeof connect;

export const execCommand = async ({
  cwd,
  command,
}: {
  cwd: string;
  command: string;
}): Promise<void> => {
  await ssh.execCommand(command, {
    cwd,
    onStdout(chunk) {
      // eslint-disable-next-line no-console
      console.log('onStdout');
      // eslint-disable-next-line no-console
      console.log(chunk.toString('utf8'));
    },
    onStderr(chunk) {
      // eslint-disable-next-line no-console
      console.log('onStderr');
      // eslint-disable-next-line no-console
      console.log(chunk.toString('utf8'));
      throw new Error('failed');
    },
  });
};
export type TExecCommand = typeof execCommand;
