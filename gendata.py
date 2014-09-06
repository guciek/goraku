#!/usr/bin/python3
# Copyright by Karol Guciek (http://guciek.github.io)
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, version 2 or 3.

import re, os, sys, jsstrip

def addCodeForFile(result, data, fid):
	result.append("func ")
	result.append(fid)
	result.append("() []byte {\n    return []byte{\n        ")
	n = 0
	for b in data:
		result.append("%d,"%b)
		n = n+1
		if n >= 16:
			n = 0
			result.append("\n        ")
	result.append("\n    }\n}\n\n")

def codeForFiles(fdata):
	array = []
	result = ["package data\n\n"]
	for fpath in fdata:
		fid = fpath.replace("/", "_").replace(".", "_")
		fid = "".join([w.capitalize() for w in fid.split("_")])
		data = fdata[fpath]
		if fpath[-3:] == ".js":
			data = bytes(jsstrip.jsstrip(str(data, "utf-8")), "utf-8")
		addCodeForFile(result,  data, fid)
		array.append("        \"")
		array.append(fpath)
		array.append("\": ")
		array.append(fid)
		array.append(",\n")
	result.append("func ByPath(p string) []byte {\n")
	result.append("    a := map[string]func()[]byte {\n")
	result.append("".join(array))
	result.append("    }\n    if b := a[p]; b != nil { return b() }\n")
	result.append("    return nil\n}\n\n")
	return "".join(result)

def generateForDirectory(directory):
	paths = []
	for root, dirs, files in os.walk(directory):
		for f in files:
			fdiskpath = root+"/"+f
			paths.append(fdiskpath)
	paths.sort()
	fdata = dict()
	for fdiskpath in paths:
		add_path = fdiskpath[len(directory)+1:]
		add_path = re.sub("\[[^\]]+\]", "", add_path)
		with open(fdiskpath, "rb") as f:
			data = f.read()
			if add_path in fdata:
				fdata[add_path] += data
			else:
				fdata[add_path] = data
	return codeForFiles(fdata)

if __name__ == "__main__":
	try:
		d = generateForDirectory("data/files")
		with open(sys.argv[1], 'w') as f:
			f.write(d)
	except Exception as e:
		sys.stderr.write("\nError: "+str(e)+"\n\n")
		sys.exit(1)
