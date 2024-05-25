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

> Deploy your project through SSH, qiniu or ali-oss, using your local machine.

## Install

```bash
npm install better-deploy
```

## Usage - SSH

```typescript
import path from 'path'
import { ssh } from 'better-deploy'

await ssh.connect({
    host: '11.22.33.44',
    port: 99,
    username: 'username',
    password: 'password'
})

const cwd = '/working-directory'
await ssh.putDirectory({
    fromPath: path.resolve(import.meta.dirname, '../'),
    toPath: cwd,
})

await ssh.execCommand({
    cwd,
    command: 'pwd && ls'
})

await ssh.execCommand({
    cwd,
    command: 'node --version && nvm --version'
})
```

## Usage - Qiniu

```typescript
import path from 'path'
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
  fromPath: path.resolve(import.meta.dirname, '../dist'),
  ignore: ['node_modules'],
  // refresh: true-自动刷新CDN
  refresh: true
})
```

## License

[MIT License](./LICENSE)
