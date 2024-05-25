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
  execCommand,
  TExecCommand,
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
  execCommand: TExecCommand;
} = {
  putDirectory,
  putFiles,
  connect,
  execCommand,
};
