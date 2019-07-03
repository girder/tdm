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
const kpfutils = require('../src/utils/divakpf');
/* eslint-disable */

program.option('-b, --basepath <basepath>', 'input KPF common name');
program.parse(process.argv);

async function loadKPF(base) {
  let files = kpfutils.KPF_EXTENSIONS
    .map(ext => new Promise((resolve) =>
      fs.readFile(`${base}.${ext}`, (err, data) => resolve(data) )));

  files = await Promise.all(files);
  return files;
}

loadKPF(program.basepath).then(files => {
  const kpf = kpfutils.default.fromText(files[0], files[1], files[2]);
  let tdm = kpf.getTDM();
  console.log(JSON.stringify(tdm));
});
