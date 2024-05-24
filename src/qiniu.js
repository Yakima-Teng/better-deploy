/**
 * 七牛接口文档：https://developer.qiniu.com/kodo/1289/nodejs#rs-delete
 */
const path = require('path')
const glob = require('glob')
const qiniu = require('qiniu')

exports.default = async (options) => {
    const {
        publicBucketDomain,
        bucketName,
        accessKey,
        secretKey,
        uploadRemotePrefix,
        deleteRemotePrefix,
        zoneName,
        fromPath,
        ignore
    } = options

    const mac = new qiniu.auth.digest.Mac(accessKey, secretKey)
    const config = new qiniu.conf.Config()

    // 空间对应的机房
    config.zone = qiniu.zone[zoneName]

    const bucketManager = new qiniu.rs.BucketManager(mac, config)

    // 获取公开空间访问链接
    const getPublicDownloadUrl = (key) => {
        return bucketManager.publicDownloadUrl(
            publicBucketDomain,
            key
        )
    }

    // 上传本地文件到七牛云
    const uploadLocalFileToQiNiu = async ({ absolutePath, relativePath }) => {
        return new Promise((resolve, reject) => {
            const formUploader = new qiniu.form_up.FormUploader(config)
            const putExtra = new qiniu.form_up.PutExtra()
            const key = `${uploadRemotePrefix}${relativePath}`.replace(/^\//, '')

            const options = {
                // 指定了key，就可以支持覆盖上传
                scope: `${bucketName}:${key}`,
                // .html文件缓存30秒，其他文件缓存10小时
                expires: key.endsWith('.html') ? 30 : 36000,
                returnBody: '{"key":"$(key)","hash":"$(etag)","fsize":$(fsize),"bucket":"$(bucket)","name":"$(x:name)"}'
            }
            const putPolicy = new qiniu.rs.PutPolicy(options)
            const uploadToken = putPolicy.uploadToken(mac)
            // 文件上传
            formUploader.putFile(uploadToken, key, absolutePath, putExtra, (
                respErr,
                respBody
            ) => {
                if (respErr) {
                    reject(respErr)
                    return
                }
                resolve(respBody)
            })
        })
    }

    // 上传目录下的所有文件到七牛云
    const uploadDirToQiNiu = async ({ fromPath, ignore }) => {
        const allFiles = await glob.glob(path.resolve(`${fromPath}/**/*`), {
            windowsPathsNoEscape: true,
            // only want the files, not the dirs
            nodir: true,
            ignore: ['node_modules', ...(ignore || [])]
        })
        const formatPath = (filePath) => {
            return filePath.replace(/^dist/, '').replace(/\\/g, '/')
        }
        const rootPath = `${formatPath(path.resolve(fromPath))}/`
        const allPaths = allFiles.map((filePath) => {
            return {
                absolutePath: formatPath(filePath),
                relativePath: formatPath(filePath).replace(rootPath, '')
            }
        })
        return Promise.all(allPaths.map(uploadLocalFileToQiNiu))
    }

    // 刷新链接，单次请求链接不可以超过100个，如果超过，请分批发送请求
    const refreshCDN = async (urlsToRefresh) => {
        if (!urlsToRefresh || urlsToRefresh.length === 0) {
            console.log('没有需要刷新的链接')
            return []
        }
        const cdnManager = new qiniu.cdn.CdnManager(mac)
        // URL 列表
        return new Promise((resolve, reject) => {
            cdnManager.refreshUrls(urlsToRefresh, (err, respBody, respInfo) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(Object.keys(respBody.taskIds), respInfo)
            })
        })
    }

    // 查询某个目录下的文件列表
    const listFiles = async (prefix = '') => {
        return new Promise((resolve, reject) => {
            bucketManager.listPrefix(bucketName, {
                prefix,
                limit: 1000
            }, (err, respBody, respInfo) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(respBody)
            })
        })
    }

    // 有目录需要清空的话，清空对应目录下的文件
    if (deleteRemotePrefix) {
        const deleteRemotePrefixList = deleteRemotePrefix.split(',')
        if (deleteRemotePrefixList.length > 0) {
            for (const prefix of deleteRemotePrefixList) {
                const fileList = await listFiles(prefix)
                const deleteKeys = fileList.items.map((item) => item.key)
                if (deleteKeys.length > 0) {
                    await bucketManager.batch(deleteKeys.map((key) => qiniu.rs.deleteOp(bucket, key)))
                }
            }
        }
    }

    const list = await uploadDirToQiNiu({
        fromPath,
        ignore
    })
    const keys = list.map((item) => item.key)
    const downloadUrlList = keys.map((key) => getPublicDownloadUrl(key))
    return refreshCDN(downloadUrlList)
}
