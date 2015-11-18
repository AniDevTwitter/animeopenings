#!/usr/bin/env python3
import os, sys, getopt, platform, subprocess

# Configuration
videoBitrate = "3200K"
maxVideoBitrate = "3700k"
threads = "4"
slices = "4"
g = "250"
useCrf = False
crf = "18"

# Globals
inputFile = ""
outputFile = "output"
startTime = ""
endTime = ""
noiseReduction = "none"

# Constants
audioBitrate = "192k"
lightNoiseReduction = "hqdn3d=0:0:3:3"
heavyNoiseReduction = "hqdn3d=1.5:1.5:6:6"
shutUp = True
usage = "Usage: encode.py -i <inputfile> [-o <outputfile>] [-s <start>] [-e <end>] [-n none|light|heavy]"


def encodeFirstPass():
	# ffmpeg -ss <start> -i <source> -to <end> -pass 1 -c:v libvpx-vp9
	#	-b:v <videoBitrate> -maxrate <maxVideoBitrate> -speed 4 -g <g>
	#	-slices <slices> -vf "scale=-1:min(720\,ih)" -threads <threads>
	#	-tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -lag-in-frames 25
	#	-an -sn -f webm -y -passlogfile <destination> /dev/null	

	args = ["ffmpeg"]
	args += getFFmpegConditionalArgs()
	args += ["-pass", "1", "-c:v", "libvpx-vp9", "-b:v", videoBitrate,
		"-maxrate", maxVideoBitrate, "-speed", "4", "-g", g, "-slices", slices,
		"-vf", "scale=-1:min(720\\,ih)", "-threads", threads,
		"-tile-columns", "6", "-frame-parallel", "1", "-auto-alt-ref", "1",
		"-lag-in-frames", "25", "-an", "-sn", "-f", "webm", "-y",
		"-passlogfile", outputFile, getNullObject()]

	subprocess.call(args)

def encodeSecondPass():
	# ffmpeg -ss <start> -i <source> -to <end> -pass 2 -c:v libvpx-vp9
	#	-b:v <videoBitrate> -maxrate <maxVideoBitrate> -speed 1 -g <g>
	#	-slices <slices> -vf "scale=-1:min(720\,ih)" -af
	#	"volume=<volume>dB:precision=double" -threads <threads> -tile-columns 6
	#	-frame-parallel 1 -auto-alt-ref 1 -lag-in-frames 25 -c:a libvorbis -b:a
	#	192k -sn -f webm -y -passlogfile <destination> <destination.webm>

	args = ["ffmpeg"]
	args += getFFmpegConditionalArgs()
	args += ["-pass", "2", "-c:v", "libvpx-vp9", "-b:v", videoBitrate,
		"-maxrate", maxVideoBitrate, "-speed", "1", "-g", g, "-slices", slices,
		"-vf", "scale=-1:min(720\\,ih)", "-af",
		"volume=" + volume + "dB:precision=double", "-threads", threads,
		"-tile-columns", "6", "-frame-parallel", "1", "-auto-alt-ref", "1",
		"-lag-in-frames", "25", "-c:a", "libvorbis", "-b:a", "192k", "-sn",
		"-f", "webm", "-y", "-passlogfile", outputFile, outputFile + ".webm"]

	subprocess.call(args)

def calcVolumeAdjustment():
	dB = 0.0

	# ffmpeg [-ss <start>] -i <source> [-to <end>] -af "volumedetect" -f null /dev/null
	with open(outputFile + ".log", "x") as f:
		args = ["ffmpeg"]
		if (startTime != ""): args += ["-ss", startTime]
		args += ["-i", inputFile]
		if (endTime != ""): args += ["-to", endTime]
		args += ["-af", "volumedetect", "-f", "null", getNullObject()]
		subprocess.call(args, stdin=None, stdout=f, stderr=f)

	# Find the line with relevant information
	with open(outputFile + ".log", "r") as f:
		lines = f.readlines()
		for line in lines:
			if "max_volume:" in line:
				start = line.index(":") + 2
				end = len(line) - 3
				dB = float(line[start:end])
				break

	os.remove(outputFile + ".log")

	return (dB * -1.0) - 0.4

def getFFmpegConditionalArgs():
	args = []
	if (shutUp):
		args += ["-loglevel", "panic"]
	if (startTime != ""):
		args += ["-ss", startTime]

	args += ["-i", inputFile]

	if (endTime != ""):
		args += ["-to", endTime]

	if (useCrf):
		args += ["-crf", crf]
	if (noiseReduction == "light"):
		args += ["-vf", lightNoiseReduction]
	if (noiseReduction == "heavy"):
		args += ["-vf", heavyNoiseReduction]

	return args

def getNullObject():
	if (platform.system() == "Windows"):
		return "NUL"
	else:
		return "/dev/null"


# "Main"
try: opts, args = getopt.getopt(sys.argv[1:],"hi:o:s:e:n:",["ifile=","ofile=","start=","end=", "noise="])
except getopt.GetoptError:
	print(usage)
	sys.exit(2)

for opt, arg in opts:
	if opt == "-h":
		print(usage)		
		sys.exit()
	elif opt in ("-i", "--ifile"):
		inputFile = arg
	elif opt in ("-o", "--ofile"):
		if arg.find(".") != -1:
			# Remove file extension from output file name.
			outputFile = arg[:arg.find(".")]
		else:
			outputFile = arg
	elif opt in ("-s", "--start"):
		startTime = arg
	elif opt in ("-e", "--end"):
		endTime = arg
	elif opt in ("-n", "--noise"):
		if (arg == "none" or arg == "light" or arg == "heavy"):
			noiseReduction = arg
		else:
			print(usage)		
			sys.exit(2)

if (inputFile == ""):
	print(usage)
	sys.exit(2)

print("\nOpenings.moe 4.2 comfy encoder!\n")
print("Input file: \"" + inputFile + "\"")
print("Output file: \"" + outputFile + ".webm\"")

print("\nChecking volume levels ...")
volume = str(calcVolumeAdjustment())
print("Volume will be adjusted by " + volume + "dB\n")

print("Running first encoding pass ...")
encodeFirstPass()
print("Running second encoding pass ...")
encodeSecondPass()
os.remove(outputFile + "-0.log")
print("Done.")
