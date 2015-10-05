#!/bin/sh
checkFonts() {
	#TODO: Check that fonts.css is valid?
	true
}
set -x
unzip "$1" -x *.ass -d CSS/
unzip "$1" *.ass -d ./
pushd CSS/
find \( -iname "*.ttf" -o -iname "*.otf" \) -exec sh ../cssgen.sh fonts_new {} +
checkFonts && mv fonts_new.css fonts.css
