# better-deploy

<p align="center" style="display: flex;align-items: center;justify-content: center;gap:8px;">
  <a href="https://npmcharts.com/compare/better-deploy?minimal=true">
    <img src="https://img.shields.io/npm/dm/better-deploy.svg" alt="Downloads">
  </a>
  <a href="https://www.npmjs.com/package/better-deploy">
    <img src="https://img.shields.io/npm/v/better-deploy.svg" alt="Version">
  </a>
  <a href="https://www.npmjs.com/package/better-deploy">
    <img src="https://img.shields.io/npm/l/better-deploy.svg" alt="License">
  </a>
</p>

> Deploy your project through SSH, ali-oss, qiniu-oss, using your local machine.

## Install

```bash
npm install better-deploy
```

## Usage - SSH

```typescript
import path from 'path'
import url from 'url'
import { ssh } from 'better-deploy'

await ssh.connect({
    host: '11.22.33.44',
    port: 99,
    username: 'username',
    password: 'password'
})

const cwd = '/working-directory'
await ssh.putDirectory({
    fromPath: path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../'),
    toPath: cwd,
})
await ssh.putFiles([
    { local: 'localFile1', remote: 'remoteFile1' },
    { local: 'localFile2', remote: 'remoteFile2' },
])

// 设置默认的工作目录
ssh.setDefaultWorkingDirectory(cwd)

await ssh.execCommand({
    // 未显式设置cwd字段时，使用上面设置的默认工作目录
    command: 'pwd && ls'
})

await ssh.execCommand({
    // 显示设置cwd时，使用具体设置的cwd作为工作目录
    cwd: cwd + '/child',
    command: 'node --version && nvm --version'
})
```

## Usage - Ali OSS

```javascript
import path from 'path'
import { ali } from "better-deploy";

ali.initConfig({
  accessKey: 'your key',
  secretKey: 'your key',
  bucketName: 'bucket',
  zoneName: 'oss-country-location',
  publicBucketDomain: 'https://www.example.com',
  uploadRemotePath: process.env.NODE_ENV === 'production' ? 'project/' : 'project-test/'
})

await ali.deleteRemotePathList(['path-to-delete/'])

await ali.uploadDir({
  fromPath: path.resolve(import.meta.dirname, '../dist'),
  ignore: ['node_modules'],
  recursive: true
})

```

## Usage - Qiniu OSS

```typescript
import path from 'path'
import url from 'url'
import { qiniu } from 'better-deploy'

qiniu.initConfig({
  accessKey: 'accessKey',
  secretKey: 'secretKey',
  bucketName: 'bucketName',
  zoneName: 'zoneName',
  // CDN加速域名，以http(s)开头
  publicBucketDomain: 'https://www.example.com',
  // 最开头不要带/，末尾要带/，如果是根路径的话就传 `/`
  uploadRemotePrefix: 'pathPrefix/',
})

// 如果上传前要先清空远端文件的话
await qiniu.deleteRemotePathList(['path-to-delete/'])

await qiniu.uploadDir({
  fromPath: path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../dist'),
  ignore: ['node_modules'],
  // refresh: true-自动刷新CDN，默认为false
  refresh: false,
  // 是否递归子目录，默认为true
  recursive: true
})

// 刷新指定链接的CDN缓存
await qiniu.refreshCDN([
    'https://www.example.com/',
])

```

## License

[MIT License](./LICENSE)
