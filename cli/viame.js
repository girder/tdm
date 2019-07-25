#!/usr/bin/env node

/*
  A command line tool to convert KPF
  to TDM.
*/

/* eslint-disable */
require = require('esm')(module);
const program = require('commander');
const fs = require('fs');
const path = require('path');
const viame = require('../src/utils/viame');
/* eslint-disable */

program.option('-f, --file <file>', 'input viame file');
program.option('-s, --separator <char>', 'Separator character', ',');
program.parse(process.argv);

async function load(file) {
  const loadedFile = await new Promise(resolve => fs.readFile(
    file,
    'utf8',
    (err, data) => resolve(data)));
  return loadedFile;
}

load(program.file).then(file => {
  const viameObj = viame.default.fromText(file, program.separator);
  let tdm = viameObj.tracks;
  console.log(JSON.stringify(tdm));
});
