#!/usr/bin/python
import os, sys, getopt, platform, subprocess

#Configuration
temporaryFile = "tmp.txt"
resolution = "720"
videoBitrate = "3200K"
maxVideoBitrate = "3700k"
audioBitrate = "192k"
threads = "8"
slices = "4"
g = "250"
lightNoiseReduction = "hqdn3d=0:0:3:3"
heavyNoiseReduction = "hqdn3d=1.5:1.5:6:6"
useCrf = False
crf = "18"
shutUp = True



def main(argv):
	# User supplied
	inputFile = ''
	outputFile = 'out.webm'
	start = ''
	end = ''
	noiseReduction = 'none'
	
	volume = "0.0"
   	
	try:
		opts, args = getopt.getopt(argv,"hi:o:s:e:n:",["ifile=","ofile=","start=","end=", "noise="])
	except getopt.GetoptError:
		print('Usage: encode.py -i <inputfile> [-o <outputfile>] [-s <start>] [-e <end>] [-n none|light|heavy]')
		sys.exit(2)
	for opt, arg in opts:
		if opt == '-h':
			print('Usage: encode.py -i <inputfile> [-o <outputfile>] [-s <start>] [-e <end>] [-n none|light|heavy]')
			sys.exit()
		elif opt in ("-i", "--ifile"):
			inputFile = arg
		elif opt in ("-o", "--ofile"):
			outputFile = arg
			if(outputFile[outputFile.rfind("."):]!=".webm"):
				outputFile+= ".webm"
		elif opt in ("-s", "--start"):
			start = arg	
		elif opt in ("-e", "--end"):
			end = arg
		elif opt in ("-n", "--noise"):
			if(arg == 'none' or arg == 'light' or arg == 'heavy'):
				noiseReduction = arg
			else:
				print('Usage: encode.py -i <inputfile> [-o <outputfile>] [-s <start>] [-e <end>] [-n none|light|heavy]')
				sys.exit(2)
	if(inputFile == ""):
		print('Usage: encode.py -i <inputfile> [-o <outputfile>] [-s <start>] [-e <end>] [-n none|light|heavy]')
		sys.exit(2)

			
	print('Openings.moe 4.2 comfy encoder!')
	print('Input file: \"' + inputFile + '\" Output file: \"' + outputFile + '\"')
	print('Checking volume levels ...')
	volume = str(calcVolumeAdjustment(inputFile))
	print('Volume will be adjusted by ' + volume + ' dB')
	print('Running 1-Pass ...')
	encodeFirstPass(inputFile, outputFile, start, end, noiseReduction)
	print('Running 2-Pass ...')
	encodeSecondPass(inputFile, outputFile, start, end, noiseReduction, volume)

	os.remove("ffmpeg2pass-0.log")

def encodeFirstPass(inputFile, outputFile, start, end, noiseReduction):
	#ffmpeg -i <source> -ss 00:00.000 -to 00:00.000 -vf scale=-1:720 -pass 1 -c:v libvpx-vp9 -b:v 3200k -maxrate 3700k -speed 4 -g 250 -slices 4 -threads 4 -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -lag-in-frames 25 -an -f webm -y -sn /dev/null
	args = ["ffmpeg", "-i", inputFile]
	args.extend(getFfmpegConditionalArgs(start, end, noiseReduction))

	args.extend(["-vf", "scale=-1:"+resolution, "-pass", "1", "-c:v", "libvpx-vp9", "-b:v", videoBitrate, 
		"-maxrate", maxVideoBitrate, "-speed", "4", "-g", g, "-slices", slices, "-threads", threads, 
		"-tile-columns", "6", "-frame-parallel", "1", "-auto-alt-ref", "1", "-lag-in-frames", "25",
		"-an", "-f", "webm", "-y", "-sn", getNullObject()])

	subprocess.call(args)

def encodeSecondPass(inputFile, outputFile, start, end, noiseReduction, volume):
	#ffmpeg -i <source> -ss <start> -to <end> -vf 'scale=-1:720' -af "volume=0dB" -pass 2 
	#-c:v libvpx-vp9 -b:v 3200k -maxrate 3700k -bufsize 6000k -speed 1 -g 250 -slices 4 -threads 4 
	#-tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -lag-in-frames 25 
	#-c:a libvorbis -b:a 192k -y -sn "output.webm"
	args = ["ffmpeg", "-i", inputFile]
	args.extend(getFfmpegConditionalArgs(start, end, noiseReduction))

	args.extend(["-vf", "scale=-1:"+resolution, "-af", "volume="+volume+"dB:precision=fixed", "-pass", "2", 
		"-c:v", "libvpx-vp9", "-b:v", videoBitrate, "-maxrate", maxVideoBitrate, "-bufsize", "6000k",
		"-speed", "1", "-g", g, "-slices", slices, "-threads", threads, 
		"-tile-columns", "6", "-frame-parallel", "1", "-auto-alt-ref", "1", "-lag-in-frames", "25",
		"-c:a", "libvorbis", "-b:a", audioBitrate, "-y", "-sn", outputFile])

	subprocess.call(args)

def calcVolumeAdjustment(inputFile):
	dB = 0.0
	f = open(temporaryFile, 'x')
	# ffmpeg -i <source> -af "volumedetect" -f null /dev/null
	subprocess.call(["ffmpeg", "-i", inputFile, "-af", "volumedetect", "-f", "null", getNullObject()],
		stdin=None, stdout=f, stderr=subprocess.STDOUT)
	f.close();

	# Find the line with relevant information
	f = open(temporaryFile, 'r')
	line = f.readline()
	while(line != ""):
		if "max_volume:" in line:
			start = line.index(':') + 2
			end = len(line) - 3
			dB = float(line[start:end])
		line = f.readline()
	f.close()
	os.remove(temporaryFile)

	return (dB * -1.0) - 0.4
	
def getFfmpegConditionalArgs(start, end, noiseReduction):
	args = []
	if(shutUp):
		args.append("-loglevel")
		args.append("panic")
	if(start != ''):
		args.append("-ss")
		args.append(start)
	if(end != ''):
		args.append("-to")
		args.append(end)
	if(useCrf):
		args.append("-crf")
		args.append(crf)
	if(noiseReduction == 'light'):
		args.append("-vf")
		args.append(lightNoiseReduction)
	if(noiseReduction == 'heavy'):
		args.append("-vf")
		args.append(heavyNoiseReduction)
	return args
	
def getNullObject():
	if(platform.system() == 'Windows'):
		return 'NUL'
	else:
		return '/dev/null'

if __name__ == "__main__":
   main(sys.argv[1:])
