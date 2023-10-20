import {resolve} from 'path';

import {Arguments, Argv} from 'yargs';

import {generatePdfs} from '../../generate';
import {Status} from '../../generate/constants';

const command = '$0';

const description = 'generate pdf from html rendered from yfm syntax';

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const handler = async (args: Arguments<any>) => {
    const inputFolder = resolve(args.input);
    const includeDirs = args['include-dirs'];
    const excludeDirs = args['exclude-dirs'];

    const status = await generatePdfs({
        inputFolder,
        includeDirs,
        excludeDirs,
    });

    switch (status) {
        case Status.FAIL:
            process.exit(1);
            break;
        default:
            process.exit(0);
    }
};

function builder<T>(argv: Argv<T>) {
    return argv
        .option('input', {
            alias: 'i',
            describe: 'Path to input folder with single page files',
            type: 'string',
        })
        .option('include-dirs', {
            default: ['**/'],
            describe:
                'Glob patterns relative to the input dir to include directories ' +
                'to search for source files to create pdf file\n' +
                'Example 1: --include-dirs "**/"\n' +
                'Example 2: --include-dirs "**/dir1" "**/dir2"\n' +
                'Syntax: https://en.wikipedia.org/wiki/Glob_(programming)#Syntax',
            type: 'array',
        })
        .option('exclude-dirs', {
            default: [],
            describe:
                'Glob patterns relative to the input dir to exclude directories ' +
                'from the search for source files to create pdf file\n' +
                'Example: --exclude-dirs "**/dir1" "**/dir2"\n' +
                'Syntax: https://en.wikipedia.org/wiki/Glob_(programming)#Syntax',
            type: 'array',
        })
        .example('docs2pdf -i ./input', '')
        .demandOption(['input'], 'Please provide input argument to work with this tool');
}

const generate = {
    command,
    description,
    handler,
    builder,
};

export {generate};

export default {generate};
