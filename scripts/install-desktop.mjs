import fs from 'node:fs';import {fileURLToPath} from 'node:url';
const exe=fileURLToPath(new URL('../../runtime/electron.exe',import.meta.url));
if(!fs.existsSync(exe))throw Error('完整运行组件缺失，请重新解压完整安装包');
console.log('完整运行组件已内置，无需下载。');
