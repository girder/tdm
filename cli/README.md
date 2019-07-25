# CLI tools

This is a loose collection of tools for working with TDM.

## Installing

* Install a recent version of Node.js
* Clone this repo
* Run `yarn install` from the parent directory

## kpf.js

An offline converter to turn KPF into TDM.

```bash
# Expect basename path to have 3 files with given extensions:

ls /path/to/kpf_basename*
# /path/to/kpf_basename.activities.yml
# /path/to/kpf_basename.geom.yml
# /path/to/kpf_basename.types.yml

# Convert
./kpf.js --basepath /path/to/kpf_basename > out.tdm.json
```

## kw18.js

An offline converter to turn KW18 into TDM.

```bash
# Expext basepath name to have 2 files with given extensions:

ls /path/to/kw18_basename*
# /path/to/kw18_basename.kw18
# /path/to/kw18_basename.kw18.types

# convert
./kw18.js --basepath /path/to/kw18_basename > out.tdm.json
```
