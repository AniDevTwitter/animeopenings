if [$# -ne 2]; then
	echo "Usage: $0 <input video> <output captions>"
fi
file=$1
out=$2
ffmpeg -y -dump_attachment:t "" -i $file ${out}.ass
find \( -iname "*.ttf" -o -iname "*.otf" \) -exec ./cssgen.sh fonts.css {} + 
