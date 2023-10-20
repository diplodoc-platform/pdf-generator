const {resolve} = require('path');

const webpack = require('webpack');

const moduleRules = {
    rules: [
        {
            test: /\.[tj]sx?$/,
            use: ['babel-loader'],
            exclude: /node_modules/,
        },
        {
            test: [/\.css$/, /\.js$/],
            use: 'raw-loader',
            include: [
                resolve('./node_modules/@diplodoc/transform/dist/css/yfm.css'),
                resolve('./node_modules/@diplodoc/transform/dist/js/yfm.js'),
                resolve('./node_modules/@diplodoc/transform/dist/js/print.js'),
            ],
        },
    ],
};

const plugins = [
    new webpack.BannerPlugin({banner: '#!/usr/bin/env node', raw: true}),
    new webpack.DefinePlugin({
        VERSION: JSON.stringify(require('./package.json').version),
    }),
];

const externals = [
    {
        'utf-8-validate': 'commonjs utf-8-validate',
        bufferutil: 'commonjs bufferutil',
        puppeteer: 'commonjs puppeteer',
    },
];

module.exports = [
    {
        mode: 'production',
        target: 'node',
        entry: './src/index.ts',
        devtool: 'eval-source-map',
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
        },
        output: {
            path: resolve(__dirname, 'build'),
            filename: 'index.js',
        },
        module: moduleRules,
        plugins,
        externals,
    },
    {
        mode: 'production',
        target: 'node',
        entry: './src/cmd/index.ts',
        devtool: 'eval-source-map',
        resolve: {
            extensions: ['.tsx', '.ts', '.js'],
        },
        output: {
            path: resolve(__dirname, 'build', 'cmd'),
            filename: 'index.js',
        },
        module: moduleRules,
        plugins,
        externals,
    },
];
