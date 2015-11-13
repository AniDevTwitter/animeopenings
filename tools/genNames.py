import json
import sys
x = json.load(sys.stdin)
for video in x:
	f = open("names/" + video['file'] + ".json",'w')
	f.write(json.dumps(video, sort_keys=True, indent=4, separators=(',', ': ')))
	f.close()
