#!/usr/bin/env python3
import os, sys, getopt, platform, subprocess, errno

# Configuration
maxVideoBitrate = "3700k"
speed = "1" # 0 == slow + higher quality, 4 == fast + lower quality #VP9 exclusive
threads = "8" # The number of cores/threads your CPU has. Probably 4.
slices = "4" # VP9 exclusive
g = "250" # VP9 exclusive


# Globals
inputFile = ""
outputFile = "output"
startTime = 0
endTime = 0
noiseReduction = "none"
videoBitrate = "3000K"
crf = "18"
use2Pass = True
useCrf = False
useVP9 = True
useH264 = False
quality = "" # Alias for videoBitrate or crf depending on the video encode method


# Constants
audioBitrate = "192k"
lightNoiseReduction = "hqdn3d=0:0:3:3"
heavyNoiseReduction = "hqdn3d=1.5:1.5:6:6"
shutUp = True
usage = "Usage: encode.py -i <inputfile> [-o <outputfile>] [-s <start>] [-e <end>] [-n none|light|heavy] [-q <quality>] [-m 2pass|crf] [-f vp9|h264]"

def HMStoS(time):
    time = time.split(":")
    if len(time) == 3:
        return int(time[0],10) * 3600 + int(time[1],10) * 60 + float(time[2])
    elif len(time) == 2:
        return int(time[0],10) * 60 + float(time[1])
    elif len(time) == 1:
        return float(time[0])
    else:
        return 0

def encodeFirstPassVP9():
    # ffmpeg -ss <start> -i <source> -to <end> -pass 1 -c:v libvpx-vp9
    #    -b:v <videoBitrate> -maxrate <maxVideoBitrate> -speed <speed> -g <g>
    #    -slices <slices> -vf "scale=-1:min(720\,ih)" -threads <threads>
    #    -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -lag-in-frames 25
    #    -an -sn -f webm -y -passlogfile <destination> /dev/null    

    args = ["ffmpeg"]
    args += getFFmpegConditionalArgs()
    args += ["-pass", "1", "-c:v", "libvpx-vp9", "-b:v", videoBitrate,
        "-maxrate", maxVideoBitrate, "-speed", speed, "-g", g, "-slices", slices,
        "-vf", "scale=-1:min(720\\,ih)", "-threads", threads,
        "-tile-columns", "6", "-frame-parallel", "1", "-auto-alt-ref", "1",
        "-lag-in-frames", "25", "-an", "-sn", "-f", "webm", "-y",
        "-passlogfile", outputFile, getNullObject()]

    subprocess.call(args)
    
def encodeFirstPassH264():
    # ffmpeg -ss <start> -i <source> -to <end> -pass 1 -c:v libx264 
    #   -b:v <videoBitrate> -maxrate <maxVideoBitrate> -bufsize 2M 
    #   -vf "scale=-1:min(720\,ih)" -threads <threads>
    #   -preset placebo -tune animation -movflags +faststart 
    #   -an -sn -f mp4 -y -passlogfile <destination> /dev/null     
    
    args = ["ffmpeg"]
    args += getFFmpegConditionalArgs()
    args += ["-pass", "1", "-c:v", "libx264", 
        "-b:v", videoBitrate, "-maxrate", maxVideoBitrate, "-bufsize", "2M",
        "-vf", "scale=-1:min(720\\,ih)", "-threads", threads,
        "-preset", "placebo", "-tune", "animation", "-movflags", "+faststart",
        "-an", "-sn", "-f", "mp4", "-y", "-passlogfile", outputFile, getNullObject()]

    subprocess.call(args)

def encodeSecondPassVP9():
    # ffmpeg -ss <start> -i <source> -to <end> -pass 2 -c:v libvpx-vp9
    #    -b:v <videoBitrate> -maxrate <maxVideoBitrate> -speed <speed> -g <g>
    #    -slices <slices> -vf "scale=-1:min(720\,ih)" -af
    #    "volume=<volume>dB:precision=double" -threads <threads> -tile-columns 6
    #    -frame-parallel 1 -auto-alt-ref 1 -lag-in-frames 25 -c:a libvorbis -b:a
    #    192k -sn -f webm -y -passlogfile <destination> <destination.webm>

    args = ["ffmpeg"]
    args += getFFmpegConditionalArgs()
    args += ["-pass", "2", "-c:v", "libvpx-vp9", "-b:v", videoBitrate,
        "-maxrate", maxVideoBitrate, "-speed", speed, "-g", g, "-slices", slices,
        "-vf", "scale=-1:min(720\\,ih)", "-af",
        "volume=" + volume + "dB:precision=double", "-threads", threads,
        "-tile-columns", "6", "-frame-parallel", "1", "-auto-alt-ref", "1",
        "-lag-in-frames", "25", "-c:a", "libvorbis", "-b:a", "192k", "-sn",
        "-f", "webm", "-y", "-passlogfile", outputFile, outputFile + ".webm"]

    subprocess.call(args)
    
    
def encodeSecondPassH264():
    # ffmpeg -ss <start> -i <source> -to <end> -pass 2 -c:v libx264 
    #   -b:v <videoBitrate> -maxrate <maxVideoBitrate> -bufsize 2M 
    #   -vf "scale=-1:min(720\,ih)" -af
    #   "volume=<volume>dB:precision=double" -threads <threads> 
    #   -preset placebo -tune animation -movflags +faststart -c:a libvorbis -b:a 192k 
    #   -sn -f mp4 -y -passlogfile <destination> <destination.mp4>

    args = ["ffmpeg"]
    args += getFFmpegConditionalArgs()
    args += ["-pass", "2", "-c:v", "libx264", 
        "-b:v", videoBitrate, "-maxrate", maxVideoBitrate, "-bufsize", "2M",
        "-vf", "scale=-1:min(720\\,ih)", "-af",
        "volume=" + volume + "dB:precision=double", "-threads", threads,
        "-preset", "placebo", "-tune", "animation", "-movflags", "+faststart", "-c:a", "libvorbis", "-b:a", "192k", 
        "-sn", "-f", "mp4", "-y", "-passlogfile", outputFile, outputFile + ".mp4"]

    subprocess.call(args)

def encodeCRFPassVP9():
    # ffmpeg -ss <start> -i <source> -to <end> -c:v libvpx-vp9 -crf <crf> 
    #    -maxrate <maxVideoBitrate> -speed <speed> -g <g>
    #    -slices <slices> -vf "scale=-1:min(720\,ih)" -af
    #    "volume=<volume>dB:precision=double" -threads <threads> -tile-columns 6
    #    -frame-parallel 1 -auto-alt-ref 1 -lag-in-frames 25 -c:a libvorbis -b:a
    #    192k -sn -f webm -y <destination.webm>

    args = ["ffmpeg"]
    args += getFFmpegConditionalArgs()
    args += ["-c:v", "libvpx-vp9", "-crf", crf, 
        "-maxrate", maxVideoBitrate, "-speed", speed, "-g", g, "-slices", slices,
        "-vf", "scale=-1:min(720\\,ih)", "-af",
        "volume=" + volume + "dB:precision=double", "-threads", threads,
        "-tile-columns", "6", "-frame-parallel", "1", "-auto-alt-ref", "1",
        "-lag-in-frames", "25", "-c:a", "libvorbis", "-b:a", "192k", "-sn",
        "-f", "webm", "-y", outputFile + ".webm"]

    subprocess.call(args)

def encodeCRFPassH264():
    # ffmpeg -ss <start> -i <source> -to <end> -c:v libx264 -crf <crf> 
    #    -maxrate <maxVideoBitrate> -bufsize 2M -vf "scale=-1:min(720\,ih)" -af
    #    "volume=<volume>dB:precision=double" -threads <threads> 
    #    -preset placebo -tune animation -movflags +faststart -c:a libvorbis -b:a 192k 
    #    -sn -f mp4 -y <destination.mp4>

    args = ["ffmpeg"]
    args += getFFmpegConditionalArgs()
    args += ["-c:v", "libx264", "-crf", crf,
        "-maxrate", maxVideoBitrate, "-bufsize", "2M", "-vf", "scale=-1:min(720\\,ih)", "-af",
        "volume=" + volume + "dB:precision=double", "-threads", threads,
        "-preset", "placebo", "-tune", "animation", "-movflags", "+faststart", "-c:a", "libvorbis", "-b:a", "192k", 
        "-sn", "-f", "mp4", "-y", outputFile + ".mp4"]

    subprocess.call(args)    
    

def calcVolumeAdjustment():
    dB = 0.0

    # ffmpeg [-ss <start>] -i <source> [-to <end>] -af "volumedetect" -f null /dev/null
    with open(outputFile + ".log", "x") as f:
        args = ["ffmpeg"]
        if (startTime != 0): args += ["-ss", str(startTime)]
        args += ["-i", inputFile]
        if (endTime != 0): args += ["-t", str(endTime-startTime)]
        args += ["-af", "volumedetect", "-f", "null", getNullObject()]
        subprocess.call(args, stdin=None, stdout=f, stderr=f)

    # Find the line with relevant information
    with open(outputFile + ".log", "r", encoding = "UTF-8") as f:
        for line in f:
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
    if (startTime != 0):
        args += ["-ss", str(startTime)]

    args += ["-i", inputFile]

    if (endTime != 0):
        args += ["-t", str(endTime-startTime)]

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

def makeSurePathExists(path):
    try:
        if path != "":
            os.makedirs(path)
    except OSError as exception:
        if exception.errno != errno.EEXIST:
            raise
        
# "Main"
try: opts, args = getopt.getopt(sys.argv[1:],"hi:o:s:e:n:q:m:f:",["ifile=","ofile=","start=","end=", "noise=", "quality=", "mode=", "format="])
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
        if os.path.basename(arg).find(".") != -1:
            # Remove file extension from output file name.
            outputFile = arg[:arg.rfind(".")]
        else:
            outputFile = arg
    elif opt in ("-s", "--start"):
        startTime = HMStoS(arg)
    elif opt in ("-e", "--end"):
        endTime = HMStoS(arg)
    elif opt in ("-n", "--noise"):
        if arg == "none" or arg == "light" or arg == "heavy":
            noiseReduction = arg
        else:
            print(usage)        
            sys.exit(2)
    elif opt in ("-q", "--quality"):
        quality = arg
    elif opt in ("-m", "--mode"):
        if arg == "2pass":
            use2Pass = True
            useCrf = False
        elif arg == "crf":
            useCrf = True
            use2Pass = False
        else:
            print(usage)        
            sys.exit(2)
    elif opt in ("-f", "--format"):
        if arg == "vp9":
            useVP9 = True
            useH264 = False
        elif arg == "h264":
            useH264 = True
            useVP9 = False
        else:
            print(usage)        
            sys.exit(2)

if inputFile == "":
    print(usage)
    sys.exit(2)
makeSurePathExists(os.path.dirname(outputFile))
if quality != "":
    if use2Pass:
        videoBitrate = quality
    elif useCrf:
        crf = quality
  
print("\nOpenings.moe 4.2+ comfy encoder!\n")
print("Input file: \"" + inputFile + "\"")
print("Output file: \"" + outputFile + (".webm" if useVP9 else ".mp4"))
print("\nEncoder: " + ("VP9" if useVP9 else "H264") + " Method: " +  (("2Pass Quality: " + videoBitrate) if use2Pass else ("CRF Quality: " + crf)))

print("\nChecking volume levels ...")
volume = str(calcVolumeAdjustment())
print("Volume will be adjusted by " + volume + "dB\n")

if use2Pass and useVP9:
    print("Running first encoding pass ...")
    encodeFirstPassVP9()
    print("Running second encoding pass ...")
    encodeSecondPassVP9()
    os.remove(outputFile + "-0.log")
elif use2Pass and useH264:
    print("Running first encoding pass ...")
    encodeFirstPassH264()
    print("Running second encoding pass ...")
    encodeSecondPassH264()
    os.remove(outputFile + "-0.log")
elif useCrf and useVP9:
    print("Running encode ...")
    encodeCRFPassVP9()
elif useCrf and useH264:
    print("Running encode ...")
    encodeCRFPassH264()
else:
    print("We should never get here ....")
    sys.exit(2)
    


print("Done.")
