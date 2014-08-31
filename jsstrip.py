#!/usr/bin/python3
# Copyright by Karol Guciek (http://guciek.github.io)
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, version 2 or 3.

import sys

def js_quoted_split(s):
	cur = ''
	quot = ''
	after_backslash = False
	for c in s+' ':
		if quot == '':
			c = ord(c)
			if c == 34 or c == 39 or c == 32 or c == 9 or c == 10 or c == 13:
				if cur != '':
					yield cur
					cur = ''
				if c == 34 or c == 39:
					quot = chr(c)
			elif c >= 33 and c <= 126:
				cur += chr(c)
			else:
				raise Exception("Unknown character %d"%c)
		else:
			if (c == quot) and (not after_backslash):
				yield quot+cur+quot
				cur = ''
				quot = ''
			else:
				c = ord(c)
				if c == 92:
					after_backslash = not after_backslash
					cur += chr(c)
				elif c >= 32 and c <= 126:
					after_backslash = False
					cur += chr(c)
				else:
					raise Exception("Unexpected character %d in string"%c)

def js_alnum(c):
	return c.isalnum() or c == '_' or c == '$'

def js_tokens(s):
	for w in js_quoted_split(s):
		if w[0] == '"' or w[0] == "'":
			yield w
			continue
		i = 0
		while i < len(w):
			j = i
			while j < len(w) and js_alnum(w[j]):
				j += 1
			if j > i:
				yield w[i:j]
				i = j
				continue
			j = i
			while j < len(w) and (w[j] == '=' or w[j] == '<' or w[j] == '<'):
				j += 1
			if j > i:
				yield w[i:j]
				i = j
				continue
			yield w[i]
			i += 1

def jsstrip(s):
	ret = ''
	for t in js_tokens(s):
		if ret != '' and js_alnum(ret[-1]) and js_alnum(t[0]):
			ret += ' '
		ret += t
	return ret

if __name__ == "__main__":
	try:
		print(jsstrip(sys.stdin.read()))
	except Exception as e:
		sys.stderr.write("\nError: "+str(e)+"\n\n")
		sys.exit(1)
