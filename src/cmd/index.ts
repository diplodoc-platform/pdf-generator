import yargs from 'yargs';

import {generate} from './generate';

yargs.command(generate).version(VERSION).help().parse();
