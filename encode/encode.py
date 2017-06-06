#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, sys, getopt, platform, subprocess, errno

# Configuration
threads = "4" # The number of cores/threads your CPU has. Probably 4.

# VP9 Configuration
VP9_slices = "4"
VP9_g = "250"
VP9_speed = "1" # 0 == slow + higher quality, 4 == fast + lower quality

# h264 Configuration
H264_preset = "veryslow" # ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow, placebo
H264_tune = "animation" # film, animation, grain, stillimage, psnr, ssim, fastdecode, zerolatency
H264_bufsize = "2M"

# Globals
inputFile = ""
outputFile = "output"
startTime = 0
endTime = 0
noiseReduction = "none"
videoResolution = "720"
videoBitrate = "3000K"
audioBitrate = "192k"
crf = "18"
quality = "" # Alias for videoBitrate or crf depending on the video encode method

# Method switches
use2Pass = True
useCrf = False
useVP9 = True # Video codec
useH264 = False # Video codec
useVorbis = True #Audio codec
useOpus = False # Audio codec

# Constants
maxVideoBitrate = "3700k"
lightNoiseReduction = "hqdn3d=0:0:3:3"
heavyNoiseReduction = "hqdn3d=1.5:1.5:6:6"
loudNormAnalyse = "loudnorm=I=-16:LRA=20:TP=-1:dual_mono=true:linear=true:print_format=json"
loudNormFilter ="loudnorm=I=-16:LRA=20:TP=-1:dual_mono=true:linear=true:measured_I=AAA:measured_LRA=BBB:measured_TP=CCC:measured_thresh=DDD:offset=EEE"

shutUp = True
usage = "Usage: encode.py -i <inputfile> [-o <outputfile>] [-s <start>] [-e <end>] [-n none|light|heavy] [-q <quality>] [-m 2pass|crf] [-f vp9|h264]"


# Video encoding
def encode2Pass():
    print("Running first encoding pass ...")
    # ffmpeg -ss <start> -i <source> -to <end> -c:v [libvpx-vp9|libx264] 
    #   -b:v <videoBitrate> -maxrate <maxVideoBitrate> -vf "scale=-1:min(720\,ih)" -threads <threads> 
    #   -slices <slices> -speed <speed> -g <g> -tile-columns 6 -auto-alt-ref 1 -lag-in-frames 25 #VP9 Options
    #   -preset placebo -tune animation -bufsize 2M -movflags +faststart  #H264 Options
    #   -an -sn -f webm -y -pass 1 -passlogfile <destination.[webm|mp4]> /dev/null    
    args = ffmpegLoglevel() + ffmpegStartTime() + ffmpegInputFile() + ffmpegEndTime() \
    + ffmpegVideoCodec() + ffmpegVideoQuality() + ffmpegVideoResolution() + ffmpegThreads() \
    + (ffmpegVP9Options() if useVP9 else ffmpegH264Options()) + ffmpegRemoveAudio() + ffmpegRemoveSubtitles() \
    + ffmpegFormat() + ffmpegOverwrite() + ffmpegPass(1) + [getNullObject()]
    call("ffmpeg", *args)

    logfile = str(ffmpegOutputFile()[0]) + "-0.log"
    if not os.path.isfile(logfile):
        print("Error: Logfile " + logfile + " not found!")
        sys.exit(2)

    print("Running second encoding pass ...")
    # ffmpeg -ss <start> -i <source> -to <end> -c:v [libvpx-vp9|libx264] 
    #   -b:v <videoBitrate> -maxrate <maxVideoBitrate> -vf "scale=-1:min(720\,ih)" -threads <threads>
    #   -slices <slices> -speed <speed> -g <g> -tile-columns 6 -auto-alt-ref 1 -lag-in-frames 25 #VP9 Options
    #   -preset placebo -tune animation -bufsize 2M -movflags +faststart  #H264 Options
    #   -c:a [libvorbis|libopus] -b:a 192k -af <loudNormFilter> 
    #   -sn -f webm -y -pass 2 -passlogfile <destination.[webm|mp4]> <destination.[webm|mp4]>
    args = ffmpegLoglevel() + ffmpegStartTime() + ffmpegInputFile() + ffmpegEndTime() \
    + ffmpegVideoCodec() + ffmpegVideoQuality() + ffmpegVideoResolution() + ffmpegThreads() \
    + (ffmpegVP9Options() if useVP9 else ffmpegH264Options()) \
    + ffmpegAudioCodec() + ffmpegAudioNormalisation() + ffmpegAudioQuality() \
    + ffmpegRemoveSubtitles() + ffmpegFormat() + ffmpegOverwrite() + ffmpegPass(2) + ffmpegOutputFile()
    call("ffmpeg", *args)

    os.remove(logfile)
    mbtree = logfile + ".mbtree"
    if os.path.isfile(mbtree):
        os.remove(mbtree)

def encodeCRF():
    print("Running encode ...")
    # ffmpeg -ss <start> -i <source> -to <end> -c:v [libvpx-vp9|libx264]
    #   -crf <crf> -maxrate <maxVideoBitrate> -vf "scale=-1:min(720\,ih)" -threads <threads> 
    #   -slices <slices> -speed <speed> -g <g> -tile-columns 6 -auto-alt-ref 1 -lag-in-frames 25 #VP9 Options
    #   -preset placebo -tune animation -bufsize 2M -movflags +faststart  #H264 Options
    #   -c:a [libvorbis|libopus] -b:a 192k -af <loudNormFilter> 
    #   -sn -f webm -y <destination.[webm|mp4]>
    args = ffmpegLoglevel() + ffmpegStartTime() + ffmpegInputFile() + ffmpegEndTime() + ffmpegVideoCodec() \
    + ffmpegVideoQuality() + ffmpegVideoResolution() + ffmpegThreads() \
    + (ffmpegVP9Options() if useVP9 else ffmpegH264Options()) \
    + ffmpegAudioCodec() + ffmpegAudioNormalisation() + ffmpegAudioQuality()\
    + ffmpegRemoveSubtitles() + ffmpegFormat() + ffmpegOverwrite() + ffmpegOutputFile()
    call("ffmpeg", *args)

# Audio normalization

def setupAudioNormalization():
    #ffmpeg -ss <start> -i <source> -to <end> -threads <threads> -c:a libvorbis 
    # -af loudnorm=I=-16:LRA=20:TP=-1:dual_mono=true:linear=true:print_format=json -vn -y -f null /dev/null
    cmd = ["ffmpeg"] + ffmpegStartTime() + ffmpegInputFile() + ffmpegEndTime() \
    + ["-c:a", "libvorbis", "-af", loudNormAnalyse, "-vn", "-y", "-f", "null", getNullObject()]
    result = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode('UTF-8').strip().split('\n')

    global loudNormFilter

    # Magic string fuckery
    AAA_line = result[-11]
    AAA_line = AAA_line[:AAA_line.rfind("\"")]
    AAA = AAA_line[AAA_line.rfind("\"")+1:]
    loudNormFilter = loudNormFilter.replace("AAA", AAA)
    BBB_line = result[-9]
    BBB_line = BBB_line[:BBB_line.rfind("\"")]
    BBB = BBB_line[BBB_line.rfind("\"")+1:]
    loudNormFilter = loudNormFilter.replace("BBB", BBB)
    CCC_line = result[-10]
    CCC_line = CCC_line[:CCC_line.rfind("\"")]
    CCC = CCC_line[CCC_line.rfind("\"")+1:]
    loudNormFilter = loudNormFilter.replace("CCC", CCC)
    DDD_line = result[-8]
    DDD_line = DDD_line[:DDD_line.rfind("\"")]
    DDD = DDD_line[DDD_line.rfind("\"")+1:]
    loudNormFilter = loudNormFilter.replace("DDD", DDD)
    EEE_line = result[-2]
    EEE_line = EEE_line[:EEE_line.rfind("\"")]
    EEE = EEE_line[EEE_line.rfind("\"")+1:]
    loudNormFilter = loudNormFilter.replace("EEE", EEE)

# ffmpeg arguments
def ffmpegInputFile():
    return ["-i", inputFile]
def ffmpegOutputFile():
    return [outputFile + (".mp4" if useH264 else ".webm")]
def ffmpegStartTime():
    if (startTime != 0):
        return ["-ss", str(startTime)]
    else:
        return []
def ffmpegEndTime():
    if (endTime != 0):
        return ["-t", str(endTime-startTime)]
    else:
        return []
def ffmpegVideoCodec():
    if useVP9:
        return ["-c:v", "libvpx-vp9"]
    elif useH264:
        return ["-c:v", "libx264"]
    else: # Should never get here ...
        sys.exit(2)
def ffmpegAudioCodec():
    if useVorbis:
        return ["-c:a", "libvorbis"]
    elif useOpus:
        return ["-c:a", "libopus"]
    else: # Should never get here ...
        sys.exit(2)
def ffmpegAudioQuality():
    return ["-b:a", audioBitrate, "-ac", "2", "-ar", "44100"]
def ffmpegAudioNormalisation():
    return ["-af", loudNormFilter]
def ffmpegNoiseReduction():
    if (noiseReduction == "light"):
        return ["-vf", lightNoiseReduction]
    elif (noiseReduction == "heavy"):
        return ["-vf", heavyNoiseReduction]
    else: return []
def ffmpegVideoQuality():
    if use2Pass:
        return ["-b:v", videoBitrate, "-maxrate", maxVideoBitrate]
    elif useCrf: #VP9 uses b:v for rate limiting in this case
        return ["-crf", crf, "-b:v", maxVideoBitrate, "-maxrate", maxVideoBitrate]
    else: # Should never get here ...
        sys.exit(2)
def ffmpegVideoResolution():
    return ["-vf", "scale=-1:min("+ videoResolution +"\,ih)"]
def ffmpegThreads():
    return ["-threads", threads]
def ffmpegVP9Options():
    return ["-slices",  VP9_slices, "-speed", VP9_speed, "-g", VP9_g, 
            "-tile-columns", "6", "-auto-alt-ref", "1", "-lag-in-frames", "25"]
def ffmpegH264Options():
    return ["-preset", H264_preset, "-tune", H264_tune, "-bufsize", H264_bufsize, 
            "-movflags", "+faststart", "-strict", "-2"]  
def ffmpegFormat():
    return ["-f", ("mp4" if useH264 else "webm")]
def ffmpegLoglevel():
    if (shutUp):
        return ["-loglevel", "panic"]
    else:
        return []
def ffmpegRemoveSubtitles():
    return ["-sn"]
def ffmpegRemoveAudio():
    return ["-an"]
def ffmpegPass(nr):
    return ["-pass", str(nr), "-passlogfile"] + ffmpegOutputFile()
def ffmpegOverwrite():
    return ["-y"]

# Utility functions
def HMStoS(time):
    time = time.split(":")
    if len(time) == 3:
        return int(time[0], 10) * 3600 + int(time[1], 10) * 60 + float(time[2])
    elif len(time) == 2:
        return int(time[0], 10) * 60 + float(time[1])
    elif len(time) == 1:
        return float(time[0])
    else:
        return 0
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
def call(program, *options):
    sys.stdout.flush()
    args = []
    args+= [program]
    for opt in options:
        args+= [opt]
    subprocess.call(args)







# Main
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
  
print("\nOpenings.moe 5.0 super comfy encoder!\n")
print("Input file: \"" + inputFile + "\"")
print("Output file: \"" + outputFile + (".webm" if useVP9 else ".mp4") + "\"") 
print("\nVideo Encoder: " + ("VP9" if useVP9 else "H264") + " Method: " +  (("2Pass Quality: " + videoBitrate) if use2Pass else ("CRF Quality: " + crf)))
print("Audio Encoder: " + ("Vorbis" if useVorbis else "Opus") + " Quality: " + audioBitrate +"\n")

setupAudioNormalization()
if use2Pass:
    encode2Pass()
elif useCrf:
    encodeCRF()
else:
    print("We should never get here ....")
    sys.exit(2)
    

print("Done.")
