import { NodeSSH } from 'node-ssh';
import {
  initConfig,
  TInitConfig,
  uploadDir,
  TUploadDir,
  refreshCDN,
  TRefreshCDN,
  deleteRemotePathList,
  TDeleteRemotePathList,
} from './qiniu';

import {
  initConfig as initConfigAli,
  TInitConfig as TInitConfigAli,
  uploadDir as uploadDirAli,
  TUploadDir as TUploadDirAli,
  uploadLocalFile as uploadLocalFileAli,
  TUploadLocalFile as TUploadLocalFileAli,
  deleteRemotePathList as deleteRemotePathListAli,
  TDeleteRemotePathList as TDeleteRemotePathListAli,
} from './ali';

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
  refreshCDN: TRefreshCDN;
  deleteRemotePathList: TDeleteRemotePathList;
} = {
  initConfig,
  uploadDir,
  refreshCDN,
  deleteRemotePathList,
};

export const ali: {
  initConfig: TInitConfigAli;
  uploadDir: TUploadDirAli;
  uploadLocalFile: TUploadLocalFileAli;
  deleteRemotePathList: TDeleteRemotePathListAli;
} = {
  initConfig: initConfigAli,
  uploadDir: uploadDirAli,
  uploadLocalFile: uploadLocalFileAli,
  deleteRemotePathList: deleteRemotePathListAli,
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
