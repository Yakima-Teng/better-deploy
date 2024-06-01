/**
 * 七牛接口文档：https://developer.qiniu.com/kodo/1289/nodejs#rs-delete
 */
import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import qiniu, { auth, conf, rs } from 'qiniu';
import Config = conf.Config;
import Mac = auth.digest.Mac;
import BucketManager = rs.BucketManager;
import PutPolicyOptions = rs.PutPolicyOptions;
import { ListedObjectEntry } from 'qiniu/StorageResponseInterface';

interface IOptions {
  accessKey: string;
  secretKey: string;
  bucketName: string;
  zoneName: keyof typeof qiniu.zone;
  // CDN加速域名，以http(s)开头
  publicBucketDomain: string;
  // 最开头不要带/，末尾要带/，如果是根路径的话就传`/`，其他的话就类似`prefix/`
  uploadRemotePrefix: string;
}

let mac: Mac;
let config: Config;
let bucketManager: BucketManager;
let _opts: IOptions;

export const initConfig = (options: IOptions): void => {
  _opts = options;
  const { accessKey, secretKey, zoneName } = _opts;

  mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
  config = new qiniu.conf.Config();

  // 空间对应的机房
  config.zone = qiniu.zone[zoneName];

  bucketManager = new qiniu.rs.BucketManager(mac, config);
};
export type TInitConfig = typeof initConfig;

// 获取公开空间访问链接
const getPublicDownloadUrl = (keys: string[]): string[] => {
  if (keys.length === 0) {
    return [];
  }
  return keys.map((key) => {
    return bucketManager.publicDownloadUrl(_opts.publicBucketDomain, key);
  });
};

// 刷新链接，单次请求链接不可以超过100个，如果超过，请分批发送请求
export const refreshCDN = async (
  urlsToRefresh: string[]
): Promise<string[]> => {
  if (urlsToRefresh.length === 0) {
    console.log(chalk.blue('没有需要刷新的链接'));
    return [];
  }
  const cdnManager = new qiniu.cdn.CdnManager(mac);
  // URL 列表
  return new Promise((resolve, reject) => {
    cdnManager.refreshUrls(
      urlsToRefresh,
      (
        err,
        respBody: { taskIds: Record<string, any> },
        respInfo: { statusCode: number; [key: string]: any }
      ) => {
        if (err) {
          reject(err);
          return;
        }
        if (respInfo.statusCode !== 200) {
          reject(respInfo);
          return;
        }
        try {
          resolve(Object.keys(respBody.taskIds));
        } catch (e) {
          console.log(respBody);
          resolve([]);
        }
      }
    );
  });
};
export type TRefreshCDN = typeof refreshCDN;

// 查询某个远程目录下的文件列表
const listFiles = async (prefix: string): Promise<ListedObjectEntry[]> => {
  const res = await bucketManager.listPrefix(_opts.bucketName, {
    prefix,
    limit: 1000,
  });
  return res.data.items || [];
};

export const deleteRemotePathList = async (
  remotePathList: string[]
): Promise<{ successItems: string[]; failItems: string[] }> => {
  const successItems: string[] = [];
  const failItems: string[] = [];
  if (remotePathList.length === 0) {
    return {
      successItems: [],
      failItems: [],
    };
  }
  // 有目录需要清空的话，清空对应目录下的文件
  for (const prefix of remotePathList) {
    const fileList = await listFiles(prefix);
    const deleteKeys = fileList.map((item) => item.key);
    if (deleteKeys.length > 0) {
      const res = await bucketManager.batch(
        deleteKeys.map((key) => qiniu.rs.deleteOp(_opts.bucketName, key))
      );
      const listRes = res.data || [];
      listRes.forEach((item, idx) => {
        if (item.code === 200) {
          successItems.push(deleteKeys[idx]);
        } else {
          failItems.push(deleteKeys[idx]);
        }
      });
    }
  }

  if (successItems.length > 0) {
    console.log(
      chalk.yellow(
        `Number of remote files deleted (${successItems.length} in total):`
      )
    );
    console.log(chalk.blue(successItems.join('\n')));
    console.log();
  }

  if (failItems.length > 0) {
    console.log(
      chalk.red(
        `Number of remote files failed to delete (${failItems.length} in total):`
      )
    );
    console.log(chalk.blue(failItems.join('\n')));
    console.log();
  }

  return {
    successItems,
    failItems,
  };
};
export type TDeleteRemotePathList = typeof deleteRemotePathList;

// 上传本地文件到七牛云
interface IPayloadUploadLocalFileToQiNiu {
  // 文件的本地绝对路径
  localPath: string;
  // 文件在服务器上相对于 uploadRemotePrefix的相对路径
  relativePath: string;
  putPolicyOptions?: PutPolicyOptions;
}
interface IReturnUploadLocalFileToQiNiu {
  key: string;
  etag: string;
  fileSize: string;
  bucket: string;
  name: string;
}
const uploadLocalFile = async ({
  localPath,
  relativePath,
  putPolicyOptions,
}: IPayloadUploadLocalFileToQiNiu): Promise<IReturnUploadLocalFileToQiNiu> => {
  const formUploader = new qiniu.form_up.FormUploader(config);
  const putExtra = new qiniu.form_up.PutExtra();
  const key = `${_opts.uploadRemotePrefix}${relativePath}`.replace(/^\//, '');

  const options = {
    // 指定了key，就可以支持覆盖上传
    scope: `${_opts.bucketName}:${key}`,
    // .html文件缓存30秒，其他文件缓存10小时
    expires: key.endsWith('.html') ? 30 : 36000,
    ...(putPolicyOptions || {}),
    returnBody:
      '{"key":"$(key)","etag":"$(etag)","fileSize":$(fsize),"bucket":"$(bucket)","name":"$(x:name)"}',
  };
  const putPolicy = new qiniu.rs.PutPolicy(options);
  const uploadToken = putPolicy.uploadToken(mac);
  // 文件上传
  const res = await formUploader.putFile(uploadToken, key, localPath, putExtra);
  return res.data as IReturnUploadLocalFileToQiNiu;
};

// 上传目录下的文件到七牛云
interface IPayloadUploadDir {
  fromPath: string;
  ignore?: string[];
  refresh: boolean;
  recursive?: boolean;
}
export const uploadDir = async ({
  fromPath,
  ignore,
  refresh = false,
  recursive = true,
}: IPayloadUploadDir): Promise<IReturnUploadLocalFileToQiNiu[]> => {
  const allFiles = await glob(
    path.resolve(recursive ? `${fromPath}/**/*` : `${fromPath}/*`),
    {
      windowsPathsNoEscape: true,
      // only want the files, not the dirs
      nodir: true,
      ignore: Array.from(new Set(['node_modules', ...(ignore || [])])),
    }
  );
  const normalizePath = (filePath: string): string => {
    return filePath.replace(/\\/g, '/');
  };
  const rootPath = `${normalizePath(path.resolve(fromPath))}/`;
  const allPaths = allFiles.map((filePath) => {
    return {
      localPath: normalizePath(filePath),
      relativePath: normalizePath(filePath).replace(rootPath, ''),
    };
  });
  const list = await Promise.all(allPaths.map(uploadLocalFile));
  console.log(
    chalk.yellow(
      `Number of files uploaded to remote (${list.length} in total):`
    )
  );
  console.log(chalk.blue(list.map((item) => item.key).join('\n')));
  console.log();

  if (refresh) {
    const keys = list.map((item) => item.key);
    const downloadUrlList = getPublicDownloadUrl(keys);
    let refreshedUrlList: string[] = [];
    if (downloadUrlList.length > 0) {
      const numGroups = Math.ceil(downloadUrlList.length / 100);
      for (let i = 0; i < numGroups; i++) {
        const tempRefreshedUrlList = await refreshCDN(
          downloadUrlList.slice(i * 100, (i + 1) * 100)
        );
        refreshedUrlList = [...refreshedUrlList, ...tempRefreshedUrlList];
      }
    }
    if (refreshedUrlList.length > 0) {
      console.log(
        chalk.yellow(
          `Number of urls refreshed (${refreshedUrlList.length} in total):`
        )
      );
      console.log(chalk.blue(refreshedUrlList.join('\n')));
      console.log();
    }
  }
  return list;
};
export type TUploadDir = typeof uploadDir;
