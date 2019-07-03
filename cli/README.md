# CLI tools

This is a loose collection of tools for working with TDM.

## kpf.js

An offline converter to turk KPF into TDM.

```bash
# Expect basename path to have 3 files with given extensions:

ls /path/to/kpf_basename*
# /path/to/kpf_basename.activities.yml
# /path/to/kpf_basename.geom.yml
# /path/to/kpf_basename.types.yml

# Convert
./kpf.js --basepath /path/to/kpf_basename > out.tdm.json
```
