#!/bin/sh
checkFonts() {
	#TODO: Check that fonts.css is valid?
	true
}
set -ex
mkdir -p assets/fonts/
unzip "$1" -x *.ass -d assets/fonts/
unzip "$1" *.ass -d subtitles/
pushd CSS/
find ../assets/fonts \( -iname "*.ttf" -o -iname "*.otf" \) -exec sh ../cssgen.sh fonts_new {} +
cp fonts.css .fonts_backup.css
checkFonts fonts_new.css && mv fonts_new.css fonts.css
