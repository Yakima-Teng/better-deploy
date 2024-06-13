import path from 'path';
import { glob } from 'glob';
import chalk from 'chalk';
import OSS from 'ali-oss';

interface IOptions {
  // 即 accessKeyId
  accessKey: string;
  // 即 accessKeySecret
  secretKey: string;
  // 即 bucket
  bucketName: string;
  // 即 region
  zoneName: string;
  // CDN加速域名，以http(s)开头
  publicBucketDomain: string;
  // 最开头不要带/，末尾要带/，如果是根路径的话就传`/`，其他的话就类似`prefix/`
  uploadRemotePath: string;
}

let client: OSS;
let _opts: IOptions;

export const initConfig = (options: IOptions): void => {
  _opts = options;
  const { accessKey, secretKey, bucketName, zoneName } = options;
  client = new OSS({
    accessKeyId: accessKey,
    accessKeySecret: secretKey,
    bucket: bucketName,
    region: zoneName,
  });
};
export type TInitConfig = typeof initConfig;

// 获取公开空间访问链接
const getPublicDownloadUrl = (keys: string[]): string[] => {
  return keys.map((key) => {
    return client.getObjectUrl(key, _opts.publicBucketDomain);
  });
};

// 查询某个远程目录下的文件列表
interface IReturnListFile {
  name: string;
  size: number;
  lastModified: string;
  etag: string;
}
const listFiles = async (prefix: string): Promise<IReturnListFile[]> => {
  const result = await client.listV2(
    {
      prefix,
      'max-keys': '1000',
    },
    {
      timeout: 30000,
    }
  );
  return (result.objects || []).map((item) => {
    return {
      name: item.name,
      size: item.size,
      lastModified: item.lastModified,
      etag: item.etag,
    };
  });
};

// 清空远程项目目录下的文件
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
    const deleteKeys = fileList.map((item) => item.name);
    const result = await client.deleteMulti(remotePathList);
    const deletedKeys: string[] = // @ts-ignore
      ((result?.deleted as { Key: string }[]) || []).map((item) => item.Key);
    deleteKeys.forEach((deleteKey) => {
      if (deletedKeys.includes(deleteKey)) {
        successItems.push(deleteKey);
      } else {
        failItems.push(deleteKey);
      }
    });
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

interface IPayloadUploadLocalFile {
  localPath: string;
  relativePath: string;
  config?: {
    headers?: Record<string, unknown>;
  };
}
interface IReturnUploadLocalFile {
  name: string;
  url: string;
  cdnUrl: string;
}
export const uploadLocalFile = async ({
  localPath,
  relativePath,
  config,
}: IPayloadUploadLocalFile): Promise<IReturnUploadLocalFile> => {
  // 自定义请求头
  const headers = {
    // 指定Object的存储类型。
    'x-oss-storage-class': 'Standard',
    // 指定Object的访问权限。
    'x-oss-object-acl': 'public-read',
    // 通过文件URL访问文件时，指定以附件形式下载文件，下载后的文件名称定义为example.txt。
    // 'Content-Disposition': `attachment; filename="${filePathAndName.split('/').reverse()[0]}"`,
    // 不以附件形式下载，直接访问
    'Content-Disposition': 'inline',
    // 设置Object的标签，可同时设置多个标签。
    'x-oss-tagging': 'Tag1=1&Tag2=2',
    // 指定PutObject操作时是否覆盖同名目标Object。此处设置为true，表示禁止覆盖同名Object。
    'x-oss-forbid-overwrite': 'false',
    ...(config?.headers || {}),
  };
  const remotePath = _opts.uploadRemotePath;
  const result = await client.put(
    remotePath + relativePath,
    localPath,
    // 自定义headers
    { headers }
  );

  const name = result.name;
  const [cdnUrl] = getPublicDownloadUrl([name]);
  return {
    name,
    url: result.url,
    cdnUrl,
  };
};
export type TUploadLocalFile = typeof uploadLocalFile;

// 上传目录下的文件到七牛云
interface IPayloadUploadDir {
  fromPath: string;
  ignore?: string[];
  recursive?: boolean;
}
export const uploadDir = async ({
  fromPath,
  ignore,
  recursive,
}: IPayloadUploadDir): Promise<IReturnUploadLocalFile[]> => {
  const allFiles = await glob.glob(
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
  console.log(chalk.blue(list.map((item) => item.name).join('\n')));
  console.log();
  return list;
};
export type TUploadDir = typeof uploadDir;
