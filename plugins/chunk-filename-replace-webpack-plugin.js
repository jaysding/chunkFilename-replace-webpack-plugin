const _webpack = require('webpack');

const PluginName = 'chunk-filename-replace-webpack-plugin';
const fileTypeMaps = {
    js: {
        pluginName: 'JsonpMainTemplatePlugin',
        moduleType: 'javascript'
    },
    css: {
        pluginName: 'mini-css-extract-plugin',
        moduleType: 'css/mini-extract'
    }
};
function insertStr(soure, start, newStr) {
    return soure.slice(0, start) + newStr + soure.slice(start);
}
const _webpack2 = _interopRequireDefault(_webpack);
function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : { default: obj };
}
const {Template} = _webpack2.default;
class ChunkFilenameReplaceWebpackPlugin {
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
                    let _source = source;
                    if (_source && _source.length > 0 && _source.indexOf('jsonpScriptSrc') !== -1) {
                        const _hrefMaps = this.getLinkHrefPathMaps(compiler, compilation, chunk, hash, 'js');
                        const originTemplateString = this.getHrefSrcPath(compiler, compilation.mainTemplate, chunk, hash, 'javascript'); // 不需要修改的chunk路径统一放在一个变量里
                        const jsChunkTemplate = Template.asString([
                            Template.indent([
                                'var originTemplate = function (chunkId) {  ',
                                Template.indent([`return ${originTemplateString}`]),
                                '};',
                                `return ${compilation.mainTemplate.requireFn}.p + eval((${JSON.stringify(_hrefMaps)})[chunkId]); //${PluginName} insert!`
                            ]),
                            ''
                        ]);
                        const insertPos = 'function jsonpScriptSrc(chunkId)';
                        _source = insertStr(_source, _source.indexOf(insertPos) + insertPos.length + 3, jsChunkTemplate);
                        return _source;
                    }
                }
            );
            compilation.mainTemplate.hooks.requireEnsure.tap(PluginName, (source, chunk, hash) => {
                let _source = source;
                const _hrefMaps = this.getLinkHrefPathMaps(compiler, compilation, chunk, hash, 'css');
                const originTemplateString = this.getHrefSrcPath(compiler, compilation.mainTemplate, chunk, hash, 'css/mini-extract');
                const cssChunkTemplate = Template.asString([
                    'var originTemplate = function (chunkId) {  ',
                    Template.indent([
                        Template.indent([
                            Template.indent([`return ${originTemplateString}`]),
                            '};'
                        ])
                    ]),
                    Template.indent([Template.indent([`href = eval((${JSON.stringify(_hrefMaps)})[chunkId]); //${PluginName} insert!`])]),
                    ''
                ]);
                _source = insertStr(_source, _source.indexOf('var fullhref'), cssChunkTemplate);
                return _source;
            });
        });

        compiler.hooks.make.tap(PluginName, (compilation) => { // 因为在webpack内部JavascriptModulesPlugin插件的compiler.hooks.compilation时，webpack对js的Chunk处理刚刚进行，而在本插件中的compiler.hooks.compilation并不能访问到js的chunk，所以就不能在compiler.hooks.compilation中修改js的chunk名称，所以在make时统一对css和js的chunk进行修改
            compilation.chunkTemplate.hooks.renderManifest.tap(PluginName, (result) => {
                const isJsChunk = /^chunk/g; // result成员的identifier^为chunk时为js chunk
                const isCssChunk = /^mini-css-extract/g;// result成员的identifier^为mini-css-extract时为css chunk
                const jsChunks = [];
                const cssChunks = [];
                if (result.length) {
                    result.forEach((i) => {
                        isJsChunk.test(i.identifier) && jsChunks.push(i);
                        isCssChunk.test(i.identifier) && cssChunks.push(i);
                    });
                    this.replaceChunkName(cssChunks, 'css');
                    this.replaceChunkName(jsChunks, 'js');
                }
            });
        });
    }

    replaceChunkName(result, fileType) { // 修改输出文件名称
        if (this.isType(this.options) === 'Array') {
            this.options.forEach((option) => {
                if (!option.from || !option.to) {
                    throw new Error(`${PluginName}: Both "from" and "to" are required fields!`);
                }
                const isReg = this.isType(option.from[fileType]) === 'RegExp';
                const isString = typeof option.from[fileType] === 'string';
                result.forEach((oldChunk) => {
                    if ((isReg && option.from[fileType].test(oldChunk.pathOptions.chunk.name)) || (isString && option.from[fileType] === oldChunk.pathOptions.chunk.name)) {
                        oldChunk.filenameTemplate = option.to[fileType];
                    }
                });
            });
        } else if (this.isType(this.options) === 'Object') {
            const isReg = this.isType(this.options.from[fileType]) === 'RegExp';
            const isString = typeof this.options.from[fileType] === 'string';
            if (!this.options.from || !this.options.to) {
                throw new Error(`${PluginName}: Both "from" and "to" are required fields!`);
            }
            result.forEach((oldChunk) => {
                if ((isReg && this.options.from[fileType].test(oldChunk.pathOptions.chunk.name)) || (isString && this.options.from[fileType] === oldChunk.pathOptions.chunk.name)) {
                    oldChunk.filenameTemplate = this.options.to[fileType];
                }
            });
        }
    }

    getHrefSrcPath(compiler, mainTemplate, chunk, hash, moduleType, to) {
        let chunkFilename;
        const isCssModule = moduleType === fileTypeMaps.css.moduleType;
        const isJsModule = moduleType === fileTypeMaps.js.moduleType;
        const cssPluginInstalled = compiler.options.plugins.find((i) => i.constructor.name === 'MiniCssExtractPlugin');

        if (!cssPluginInstalled && isCssModule) {
            throw new Error('Make sure the mini-css-extract-plugin is installed !');
        }
        if (!cssPluginInstalled.options.chunkFilename && isCssModule) {
            throw new Error('Make sure the chunkFilename option for the mini-css-extract-plugin is set !');
        }
        if (isCssModule) {
            chunkFilename = cssPluginInstalled.options.chunkFilename;
        }
        if (isJsModule) {
            chunkFilename = mainTemplate.outputOptions.chunkFilename;
        }
        const chunkMaps = chunk.getChunkMaps();
        return mainTemplate.getAssetPath(JSON.stringify(to || chunkFilename), {
            hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
            hashWithLength: (length) => `" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`,
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
                contentHash: {[moduleType]: `" + ${JSON.stringify(chunkMaps.contentHash[moduleType])}[chunkId] + "`},
                contentHashWithLength: {
                    [moduleType]: (length) => {
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
        const linkHrefPathMaps = {};
        const { mainTemplate } = compilation;
        const chunkMaps = chunk.getChunkMaps();
        let isReg;
        let isString;
        const optionArr = this.isType(this.options) === 'Array';
        const optionObj = this.isType(this.options) === 'Object';
        Object.keys(chunkMaps.name).forEach((oldChunk) => {
            if (optionArr) {
                this.options.forEach((option) => {
                    if (!option.from || !option.to) {
                        throw new Error(`${PluginName}: Both "from" and "to" are required fields!`);
                    }
                    isReg = this.isType(option.from[fileType]) === 'RegExp';
                    isString = typeof option.from[fileType] === 'string';
                    if ((isReg && option.from[fileType].test(oldChunk)) || (isString && option.from[fileType] === oldChunk)) {
                        linkHrefPathMaps[oldChunk] = this.getHrefSrcPath(compiler, mainTemplate, chunk, hash, fileTypeMaps[fileType].moduleType, option.to[fileType]);
                    }
                });
            } else if (optionObj) {
                isReg = this.isType(this.options.from[fileType]) === 'RegExp';
                isString = typeof this.options.from[fileType] === 'string';
                if (!this.options.from || !this.options.to) {
                    throw new Error(`${PluginName}: Both "from" and "to" are required fields!`);
                }
                if ((isReg && this.options.from[fileType].test(oldChunk)) || (isString && this.options.from[fileType] === oldChunk)) {
                    linkHrefPathMaps[oldChunk] = this.getHrefSrcPath(compiler, mainTemplate, chunk, hash, fileTypeMaps[fileType].moduleType, this.options.to[fileType]);
                }
            }
        });
        Object.keys(Object.assign({}, chunkMaps?.hash ?? {}, chunkMaps.name)).forEach((i) => { // 保留不需要修改的chunk路径 2021/12/27：当chunk中存在chunk-xxx时，从chunkMaps.hash里取值
            if (!Object.hasOwnProperty.call(linkHrefPathMaps, i)) {
                linkHrefPathMaps[i] = 'originTemplate(chunkId)'; // originTemplate是不需要修改的chunk路径变量，对运行时代码优化，减少冗余代码
            }
        });
        return linkHrefPathMaps;
    }

    isType(obj) {
        return Object.prototype.toString.call(obj).replace(/^\[object ((\S+))\]$/g, '$1');
    }
}

module.exports = ChunkFilenameReplaceWebpackPlugin;
