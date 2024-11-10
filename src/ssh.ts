import path from 'path';
import {
  NodeSSH,
  SSHGetPutDirectoryOptions,
  SSHPutFilesOptions,
} from 'node-ssh';
import chalk from 'chalk';

const ssh = new NodeSSH();

interface IPayloadPutDir {
  fromPath: string;
  toPath: string;
  options?: SSHGetPutDirectoryOptions;
}
interface IPathPair {
  localPath: string;
  remotePath: string;
}
interface IReturnPutDir {
  success: boolean;
  failItems: IPathPair[];
  successItems: IPathPair[];
}
export const putDirectory = async ({
  fromPath,
  toPath,
  options,
}: IPayloadPutDir): Promise<IReturnPutDir> => {
  const failItems: IPathPair[] = [];
  const successItems: IPathPair[] = [];
  const success = await ssh.putDirectory(fromPath, toPath, {
    recursive: true,
    concurrency: 10,
    validate(itemPath) {
      const baseName = path.basename(itemPath);
      return baseName !== 'node_modules';
    },
    tick(localPath, remotePath, error) {
      if (error) {
        failItems.push({ localPath, remotePath });
      } else {
        successItems.push({ localPath, remotePath });
      }
    },
    ...(options || {}),
  });

  if (successItems.length > 0) {
    console.log(
      chalk.yellow(
        `Number of files transfer successfully (${successItems.length} in total)`
      )
    );
    console.log(
      chalk.blue(
        successItems
          .map((item) => `${item.localPath} => ${item.remotePath}`)
          .join('\n')
      )
    );
    console.log();
  }

  if (failItems.length > 0) {
    console.log(
      chalk.red(
        `Number of files transfer successfully (${failItems.length} in total)`
      )
    );
    console.log(chalk.blue(failItems.join('\n')));
    console.log();
  }

  return {
    success,
    failItems,
    successItems,
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

let defaultWorkingDirectory = '';
export const setDefaultWorkingDirectory = (val: string): void => {
  defaultWorkingDirectory = val;
};
export type TSetDefaultWorkingDirectory = typeof setDefaultWorkingDirectory;
export const execCommand = async ({
  cwd = defaultWorkingDirectory,
  command,
}: {
  cwd: string;
  command: string;
}): Promise<void> => {
  console.log(chalk.bgGreen(`[EXECUTE]: ${command}`));
  await ssh.execCommand(command, {
    cwd,
    onStdout(chunk) {
      console.log(
        chalk.yellow('[STDOUT]') + chalk.blue(chunk.toString('utf8'))
      );
    },
    onStderr(chunk) {
      console.log(chalk.red('[STDERR]') + chalk.blue(chunk.toString('utf8')));
    },
  });
};
export type TExecCommand = typeof execCommand;

export const rawSSH = ssh;
