#!/usr/bin/env node

const { program } = require('commander')
const packageJson = require('./package.json')

program.version(packageJson.version)

require('./src/create-bot')(program)
require('./src/create-jwt')(program)
require('./src/create-key-pairs')(program)
require('./src/simulate-device-write-log')(program)
require('./src/simulate-mobile-app-endpoint')(program)
require('./src/measure-server-performance')(program)

program.parse(process.argv)
