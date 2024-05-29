import { NodeSSH } from 'node-ssh';
import {
  initConfig,
  TInitConfig,
  uploadDir,
  TUploadDir,
  deleteRemotePathList,
  TDeleteRemotePathList,
} from './qiniu';

import {
  putDirectory,
  TPutDirectory,
  putFiles,
  TPutFiles,
  connect,
  TConnect,
  setDefaultWorkingDirectory,
  TSetDefaultWorkingDirectory,
  execCommand,
  TExecCommand,
  rawSSH,
} from './ssh';

export const qiniu: {
  initConfig: TInitConfig;
  uploadDir: TUploadDir;
  deleteRemotePathList: TDeleteRemotePathList;
} = {
  initConfig,
  uploadDir,
  deleteRemotePathList,
};

export const ssh: {
  putDirectory: TPutDirectory;
  putFiles: TPutFiles;
  connect: TConnect;
  setDefaultWorkingDirectory: TSetDefaultWorkingDirectory;
  execCommand: TExecCommand;
  rawSSH: NodeSSH;
} = {
  putDirectory,
  putFiles,
  connect,
  setDefaultWorkingDirectory,
  execCommand,
  rawSSH,
};
