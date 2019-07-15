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
const kw18 = require('../src/utils/kw18');
/* eslint-disable */

program.option('-b, --basepath <basepath>', 'input KPF common name');
program.parse(process.argv);

async function loadKPF(base) {
  let files = kw18.KW18_EXTENSIONS
    .map(ext => new Promise((resolve) =>
      fs.readFile(`${base}.${ext}`, 'utf8', (err, data) => resolve(data) )));

  files = await Promise.all(files);
  return files;
}

loadKPF(program.basepath).then(files => {
  const kw18obj = kw18.default.fromText(files[0], files[1]);
  let tdm = kw18obj.tracks;
  console.log(JSON.stringify(tdm));
});
