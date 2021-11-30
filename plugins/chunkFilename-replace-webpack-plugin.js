const _webpack = require('webpack');

const PluginName = 'filename-replace-webpack-plugin';
const fileTypeMaps = {
    js: {
        pluginName: 'JsonpMainTemplatePlugin',
        moduleType: 'javascript'
    },
    css: {
        pluginName: 'mini-css-extract-plugin',
        moduleType: 'css/mini-extract'
    }
}
function insertStr(soure, start, newStr){   
    return soure.slice(0, start) + newStr + soure.slice(start);
 }
var _webpack2 = _interopRequireDefault(_webpack);
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const {
    Template
  } = _webpack2.default;
class FilenameReplaceWebpackPlugin {
    constructor(options) {
        /**
         * interface Type {
         *      js: string;
         *      css: string;
         * }
         * interface Object {
         *      form: <Type>,
         *      to: <Type>;
         * }
         * @params  Object or Array<Obj>
         */
        this.options = options;
    }
    
    apply(compiler) {
        compiler.hooks.compilation.tap(PluginName, (compilation) => {
            compilation.mainTemplate.hooks.localVars.tap(
                PluginName,
                (source, chunk, hash) => {
                    if(source && source.length > 0 && source.indexOf('jsonpScriptSrc') !== -1) {
                        let _hrefMaps = this.getLinkHrefPathMaps(compiler, compilation, chunk, hash, 'js');
                        let jsChunkTemplate = Template.asString([`return ${compilation.mainTemplate.requireFn}.p + eval(eval((${JSON.stringify(_hrefMaps)}))[chunkId]); //${PluginName} insert!\n`])
                        let insertPos = 'function jsonpScriptSrc(chunkId)';
                        source = insertStr(source, source.indexOf(insertPos) + insertPos.length + 3, jsChunkTemplate);
                        return source
                    }
                }
            );
            compilation.mainTemplate.hooks.requireEnsure.tap(PluginName, (source, chunk, hash) => {
                let _hrefMaps = this.getLinkHrefPathMaps(compiler, compilation, chunk, hash, 'css');
                let cssChunkTemplate = Template.asString([`href = eval((eval(${JSON.stringify(_hrefMaps)})[chunkId])); //${PluginName} insert!\n`])
                source = insertStr(source, source.indexOf('var fullhref'), cssChunkTemplate);
                return source
              });
        })

        compiler.hooks.make.tap(PluginName, (compilation) => { // 因为在webpack内部JavascriptModulesPlugin插件的compiler.hooks.compilation时，webpack对js的Chunk处理刚刚进行，而在本插件中的compiler.hooks.compilation并不能访问到js的chunk，所以就不能在compiler.hooks.compilation中修改js的chunk名称，所以在make时统一对css和js的chunk进行修改
            compilation.chunkTemplate.hooks.renderManifest.tap(PluginName, (result) => {
                let isJsChunk = /^chunk/g; // result成员的identifier^为chunk时为js chunk
                let isCssChunk = /^mini-css-extract/g;// result成员的identifier^为mini-css-extract时为css chunk
                let jsChunks = [];
                let cssChunks = [];
                if(result.length) {
                    result.forEach(i => {
                        isJsChunk.test(i.identifier) && jsChunks.push(i);
                        isCssChunk.test(i.identifier) && cssChunks.push(i);
                    })
                    this.replaceChunkName(cssChunks, 'css');
                    this.replaceChunkName(jsChunks, 'js');
                }
            });
        })
	}
    replaceChunkName(result, fileType) { // 修改输出文件名称
        if(this.isType(this.options) === 'Array') {
            this.options.forEach(option => {
                if(!option.from || !option.to) {
                    throw new Error(`${PluginName}: Both "from" and "to" are required fields!`);
                }
                let isReg = this.isType(option.from[fileType]) === 'RegExp';
                let isString = typeof option.from[fileType] === 'string';
                result.forEach(oldChunk => {
                    if ((isReg && option.from[fileType].test(oldChunk.pathOptions.chunk.name)) || (isString && option.from[fileType] === oldChunk.pathOptions.chunk.name)) {
                        oldChunk.filenameTemplate = option.to[fileType];
                    }
                })
            })
        } else if(this.isType(this.options) === 'Object') {
            let isReg = this.isType(this.options.from[fileType]) === 'RegExp';
            let isString = typeof this.options.from[fileType] === 'string';
            if(!this.options.from || !this.options.to) {
                throw new Error(`${PluginName}: Both "from" and "to" are required fields!`);
            }
            result.forEach(oldChunk => {
                if ((isReg && this.options.from[fileType].test(oldChunk.pathOptions.chunk.name)) || (isString && this.options.from[fileType] === oldChunk.pathOptions.chunk.name)) {
                    oldChunk.filenameTemplate = this.options.to[fileType];
                }
            })
        }
    }
    getHrefSrcPath(compiler, mainTemplate, chunk, hash, moduleType, to) {
        let chunkFilename;
        let isCssModule = moduleType === fileTypeMaps.css.moduleType;
        let isJsModule = moduleType === fileTypeMaps.js.moduleType;
        let cssPluginInstalled = compiler.options.plugins.find(i => i.constructor.name === 'MiniCssExtractPlugin');
        
        if(!cssPluginInstalled && isCssModule) {
            throw new Error('Make sure the mini-css-extract-plugin is installed !');
        }
        if(!cssPluginInstalled.options.chunkFilename && isCssModule) throw new Error('Make sure the chunkFilename option for the mini-css-extract-plugin is set !');
        if(isCssModule) chunkFilename = cssPluginInstalled.options.chunkFilename;
        if(isJsModule) chunkFilename = mainTemplate.outputOptions.chunkFilename;
        const chunkMaps = chunk.getChunkMaps();
        return mainTemplate.getAssetPath(JSON.stringify(to || chunkFilename), {
            hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
            hashWithLength: length => `" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`,
            chunk: {
                id: '" + chunkId + "',
                hash: `" + ${JSON.stringify(chunkMaps.hash)}[chunkId] + "`,
                hashWithLength(length) {
                    const shortChunkHashMap = Object.create(null);
                    for (const chunkId of Object.keys(chunkMaps.hash)) {
                        if (typeof chunkMaps.hash[chunkId] === 'string') {
                            shortChunkHashMap[chunkId] = chunkMaps.hash[chunkId].substring(0, length);
                        }
                    }
                    return `" + ${JSON.stringify(shortChunkHashMap)}[chunkId] + "`;
                },
                contentHash: {
                    [moduleType]: `" + ${JSON.stringify(chunkMaps.contentHash[moduleType])}[chunkId] + "`
                },
                contentHashWithLength: {
                    [moduleType]: length => {
                    const shortContentHashMap = {};
                    const contentHash = chunkMaps.contentHash[moduleType];
                    for (const chunkId of Object.keys(contentHash)) {
                        if (typeof contentHash[chunkId] === 'string') {
                        shortContentHashMap[chunkId] = contentHash[chunkId].substring(0, length);
                        }
                    }
                    return `" + ${JSON.stringify(shortContentHashMap)}[chunkId] + "`;
                    }
                },
                name: `" + (${JSON.stringify(chunkMaps.name)}[chunkId]||chunkId) + "`
            },
            contentHashType: moduleType
        });
    }

    getLinkHrefPathMaps(compiler, compilation, chunk, hash, fileType = 'css') { // 修改在入口文件中动态引入的文件名称
        let linkHrefPathMaps = {};
        const { mainTemplate } = compilation;
        const chunkMaps = chunk.getChunkMaps();
        let isReg;
        let isString;
        let optionArr = this.isType(this.options) === 'Array';
        let optionObj = this.isType(this.options) === 'Object';
        Object.keys(chunkMaps.name).forEach(oldChunk => {
            if(optionArr) {
                this.options.forEach(option => {
                    if(!option.from || !option.to) throw new Error(`${PluginName}: Both "from" and "to" are required fields!`);
                    isReg = this.isType(option.from[fileType]) === 'RegExp';
                    isString = typeof option.from[fileType] === 'string';
                    if ((isReg && option.from[fileType].test(oldChunk)) || (isString && option.from[fileType] === oldChunk)) {
                        linkHrefPathMaps[oldChunk] = this.getHrefSrcPath(compiler, mainTemplate, chunk, hash, fileTypeMaps[fileType].moduleType, option.to[fileType]);
                    }
                })
            } else if (optionObj) {
                isReg = this.isType(this.options.from[fileType]) === 'RegExp';
                isString = typeof this.options.from[fileType] === 'string';
                if(!this.options.from || !this.options.to) throw new Error(`${PluginName}: Both "from" and "to" are required fields!`);
                if ((isReg && this.options.from[fileType].test(oldChunk)) || (isString && this.options.from[fileType] === oldChunk)) {
                    linkHrefPathMaps[oldChunk] = this.getHrefSrcPath(compiler, mainTemplate, chunk, hash, fileTypeMaps[fileType].moduleType, this.options.to[fileType]);
                }
            }
        })
        Object.keys(chunkMaps.name).forEach(i => { // 保留不需要修改的chunk路径
            if(!Object.hasOwnProperty.call(linkHrefPathMaps, i)) {
                // compiler.options.plugins.MiniCssExtractPlugin.chunkFilename
                linkHrefPathMaps[i] = this.getHrefSrcPath(compiler, mainTemplate, chunk, hash, fileTypeMaps[fileType].moduleType);
            }
        })
        return linkHrefPathMaps
    }

    isType(obj) {
        return Object.prototype.toString.call(obj).replace(/^\[object ((\S+))\]$/g, '$1')
    }
}

module.exports = FilenameReplaceWebpackPlugin;