const { NodeSSH } = require('node-ssh')

const ssh = new NodeSSH()

const putDirectory = async ({ fromPath, toPath, validate }) => {
    const failed = []
    const successful = []
    const status = await ssh
        .putDirectory(fromPath, toPath, {
            recursive: true,
            concurrency: 10,
            validate,
            tick (localPath, remotePath, error) {
                if (error) {
                    failed.push(localPath)
                } else {
                    successful.push(localPath)
                }
            }
        })
    // eslint-disable-next-line no-console
    console.log(`transfer was ${status ? 'successful' : 'unsuccessful'}: [${fromPath} => ${toPath}]`)
    console.log('failed transfers', failed.join(', '))
    console.log('successful transfers', successful.join(', '))
    return {
        status,
        failed,
        successful
    }
}

const putFiles = async (transferInfoList) => {
    await ssh.putFiles(transferInfoList)
}

exports.default = async (config) => {
    const {
        host,
        port,
        username,
        password,
        transferPathList,
        transferFileList,
        commandList,
        cwd
    } = config

    await ssh.connect({
        host,
        port,
        username,
        password
    })

    if (transferPathList && transferPathList.length > 0) {
        for (const transferInfo of transferPathList) {
            const { fromPath, toPath, validate } = transferInfo
            await putDirectory({
                fromPath,
                toPath,
                validate
            })
        }
    }

    if (transferFileList && transferFileList.length > 0) {
        await putFiles(transferFileList)
    }

    if (commandList && commandList.length > 0) {
        const execCommand = commandList.join(' && ')
        await ssh.execCommand(execCommand, {
            cwd,
            onStdout (chunk) {
                // eslint-disable-next-line no-console
                console.log('onStdout')
                // eslint-disable-next-line no-console
                console.log(chunk.toString('utf8'))
            },
            onStderr (chunk) {
                // eslint-disable-next-line no-console
                console.log('onStderr')
                // eslint-disable-next-line no-console
                console.log(chunk.toString('utf8'))
                throw new Error('failed')
            }
        })
    }
    // eslint-disable-next-line no-console
    console.log('发布结束')
    process.exit(0)
}
