const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

const tokens = core.getInput('token').split(' ');

const repository = core.getInput('repository');
const files = core.getInput('files', { required: true }).split(' ');
const branch = core.getInput('branch');


const owner = repository.split('/')[0]
const repo = repository.split('/')[1]
const ref = core.getInput('branch');

function getContentParams() {
    let params = { owner, repo }

    if (ref) { params.ref = ref }
    return params;
}

function getContent(path) {
    octokit.rest.repos.getContent({ path, ...getContentParams() })
        .then(data => {
            if (Array.isArray(data.data)) {
                data.data.forEach(fileData => getContent(fileData.path))
            } else {
                saveContent(data.data)
            }
        })
}

function saveContent(data) {
    const fileContent = Buffer.from(data.content, 'base64').toString('utf-8');
    if (data.path.includes('/')) {
        let foldersPath = data.path.split('/')
        foldersPath.pop()
        fs.mkdirSync(foldersPath.join('/'), { recursive: true });
    }
    fs.writeFile(data.path, fileContent, err => { if (err) throw err });
}

tokens.forEach((token, index, arr) => {
    octokit = github.getOctokit(token);
    try {
        files.forEach((file, index, arr) => {
            try {
                getContent(file);
                files.shift();
            }
            catch (ex) {
                throw ex;
            }
        });
        arr.length = index + 1
    }
    catch (ex) {
        if (index == 2) {
            throw ex;
        }
    }
});
