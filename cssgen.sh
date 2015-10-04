writeEntry() {
	while read line; do
		echo '@font-face {
		font-family: "'$line'";
		src: url("'$1'");
	}'
	done
}
show=$1
shift
for file in "$@"; do
	fc-query -f %{family} "$file" | awk '{print $0}' RS=',' | writeEntry "$file"
done > ${show}.css
