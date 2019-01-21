#!/usr/bin/env python3

import os, subprocess, math
from subtitleConverter import convert as simplifySubtitles
from settings import use2Pass, useCrf, threads, ffprobeLocation, ffmpegLocation, video, audio, debugFFmpeg, TYPES

# Constants
lightNoiseReduction = "hqdn3d=0:0:3:3"
heavyNoiseReduction = "hqdn3d=1.5:1.5:6:6"
loudNormAnalyse = "loudnorm=I=-16:LRA=20:TP=-1:dual_mono=true:linear=true:print_format=json"
loudNormFilter = "loudnorm=I=-16:LRA=20:TP=-1:dual_mono=true:linear=true:measured_I=AAA:measured_LRA=BBB:measured_TP=CCC:measured_thresh=DDD:offset=EEE"

# Globals
inputFile = ""
outputFile = "output"
startTime = 0.0
endTime = 0.0
noiseReduction = "none" # none, light, heavy
LNFilter = ""


def encode(video, encodeDir, types):
    global outputFile, inputFile, startTime, endTime, LNFilter

    outputFile = os.path.join(encodeDir, video.parentSeries.parentIP.name, video.parentSeries.name, video.getFileName())
    inputFile = video.file
    startTime = HMStoS(video.timeStart)
    endTime = HMStoS(video.timeEnd)

    print("Status: ",  end="", flush=True)
    ensurePathExists(outputFile)

    # encode audio
    LNFilter = ""
    for t in types:
        if encodeNecessary(video, outputFile + "." + t.aExt):
            if audio.normalize and not LNFilter:
                print("audio norm", end="", flush=True)
                LNFilter = setupAudioNormalization()
                print(" O ", end="", flush=True)
            print(t.aExt, end="", flush=True)
            encodeAudio(t.aExt)
            print(" O ",  end="", flush=True)
        else:
            print(t.aExt + " X ", end="", flush=True)

    # encode video
    for t in types:
        print(t.vExt, end="", flush=True)
        if encodeNecessary(video, outputFile + "." + t.vExt):
            encodeVideo(t.vExt)
            print(" O ",  end="", flush=True)
        else:
            print(" X ", end="", flush=True)

    print("\n", flush=True)
    return outputFile


def encodeNecessary(video, outputFile):
    if os.path.exists(outputFile) and os.path.isfile(outputFile):
        outputLastModifiedTime = os.path.getmtime(outputFile)
        if outputLastModifiedTime > video.lastModifiedTime:
            return False
    return True
def getInputDimensions():
    # ffprobe -hide_banner -loglevel panic -select_streams v:0 -show_entries stream=width,height <source>
    cmd = [ffprobeLocation, "-hide_banner", "-loglevel", "panic", "-select_streams", "v:0", "-show_entries", "stream=width,height", inputFile]
    result = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode("UTF-8").strip().split("\n")

    for line in result:
        if "width" in line:
            width = int(line.split("=")[1],10)
        elif "height" in line:
            height = int(line.split("=")[1],10)

    return width, height
def getOutputDimensions(inWidth, inHeight):
    maxWidth, maxHeight = video.default.maxWidth, video.default.maxHeight
    if inWidth < maxWidth and inHeight < maxHeight:
        return inWidth, inHeight

    if inWidth < maxWidth: # too tall
        outWidth, outHeight = (inWidth * maxHeight / inHeight, maxHeight)
    elif inHeight < maxHeight: # too wide
        outWidth, outHeight = (maxWidth, inHeight * maxWidth / inWidth)
    else: # too tall and too wide
        divisor = max(inHeight / maxHeight, inWidth / maxWidth)
        outWidth, outHeight = (inWidth / divisor, inHeight / divisor)

    return int(outWidth), int(outHeight)
def setupAudioNormalization():
    # ffmpeg -ss <start> -i <source> -to <end> -c:a flac -af <loudNormAnalyse> -vn -sn -map_metadata -1 -f null /dev/null
    cmd = [ffmpegLocation] + ffmpegStartTime() + ffmpegInputFile() + ffmpegEndTime() + ["-c:a", "flac", "-af", loudNormAnalyse] \
        + ffmpegNoVideo() + ffmpegNoSubtitles() + ffmpegNoMetadata() + ["-f", "null", os.devnull]
    result = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode("UTF-8").strip().split("\n")

    # NOT global
    LNFilter = loudNormFilter

    # parse JSON result line-by-line
    for line in result:
        tokens = line.strip().split()
        if len(tokens) != 3: continue
        attribute = tokens[0][1:-1]
        value = tokens[2].replace("\"","").replace(",","")

        if attribute == "input_i":
            LNFilter = LNFilter.replace("AAA", value)
        elif attribute == "input_lra":
            LNFilter = LNFilter.replace("BBB", value)
        elif attribute == "input_tp":
            LNFilter = LNFilter.replace("CCC", value)
        elif attribute == "input_thresh":
            LNFilter = LNFilter.replace("DDD", value)
        elif attribute == "target_offset":
            LNFilter = LNFilter.replace("EEE", value)

    return LNFilter


# ffmpeg arguments
def ffmpegInputFile():
    return ["-i", inputFile]
def ffmpegOutputFile(ext):
    return [outputFile + "." + ext]
def ffmpegStartTime():
    return ["-ss", str(startTime)] if startTime > 0 else []
def ffmpegEndTime():
    # -ss is applied before -i, so you shouldn't use -to here
    return ["-t", str(endTime - startTime)] if endTime > 0 else []

def ffmpegVideoCodec(ext):
    if ext == "vp9":
        return ["-c:v", "libvpx-vp9"]
    elif ext == "h264":
        return ["-c:v", "libx264"]
    elif ext == "av1":
        return ["-c:v", "libaom-av1"]
    else: raise NotImplementedError("'" + ext + "' is not a supported video codec")
def ffmpegVideoQuality():
    if use2Pass:
        return ["-b:v", video.default.bitrate, "-maxrate", video.default.maxBitrate]
    elif useCrf:
        return ["-crf", video.default.crf, "-b:v", video.default.bitrate, "-maxrate", video.default.maxBitrate]
    else: raise ValueError("You must use one of 2-Pass or CRF")
def ffmpegVideoOptions(ext, outWidth, outHeight):
    if ext == "vp9":
        return ["-slices", video.VP9.slices, "-speed", video.VP9.speed, "-g", video.VP9.g, "-tile-columns", "6", "-frame-parallel", "0", "-auto-alt-ref", "1", "-row-mt", "1", "-lag-in-frames", "25"]
    elif ext == "h264":
        return ["-preset", video.H264.preset, "-tune", video.H264.tune, "-bufsize", video.H264.bufsize, "-movflags", "+faststart", "-strict", "experimental"]
    elif ext == "av1":
        if video.AV1.useTiles:
            tiles = ["-tiles", str(math.ceil(outWidth/128)) + "x" + str(math.ceil(outHeight/128))]
        else: tiles = []
        return ["-cpu-used", video.AV1.cpuUsed, "-g", video.AV1.g] + tiles + ["-auto-alt-ref", "1", "-row-mt", "1", "-lag-in-frames", "25", "-strict", "experimental"]
    else: raise NotImplementedError(f"'{ext}' is not a supported video format")
def ffmpegVideoFilters(ext, outWidth, outHeight):
    filters = f"scale={outWidth}:{outHeight}"

    if (noiseReduction == "light"):
        filters += "," + lightNoiseReduction
    elif (noiseReduction == "heavy"):
        filters += "," + heavyNoiseReduction

    # AV1 supports 10-bit for all modes, so use it.
    return ["-vf", filters, "-pix_fmt", "yuv420p10le" if ext == "av1" else "yuv420p"]

def ffmpegAudioCodec(ext):
    if ext == "vorbis":
        return ["-c:a", "libvorbis"]
    elif ext == "opus":
        return ["-c:a", "libopus"]
    elif ext == "aac":
        return ["-c:a", "aac"]
    else: raise NotImplementedError("'" + ext + "' is not a supported audio codec")
def ffmpegAudioQuality():
    return ["-ar", audio.sampleRate, "-b:a", audio.bitrate, "-ac", "2"]
def ffmpegAudioNormalisation():
    return ["-af", LNFilter] if audio.normalize else []

def ffmpegLoglevel():
    return ["-loglevel", debugFFmpeg]
def ffmpegThreads():
    return ["-threads", threads]
def ffmpegFormat(ext):
    if ext in ("vorbis", "opus"):
        return ["-f", "ogg"]
    elif ext in ("aac", "h264"):
        return ["-f", "mp4"]
    elif ext in ("vp9","av1"):
        return ["-f", "webm"]
    else: raise NotImplementedError("'" + ext + "' is not a supported output format")
def ffmpegPass(n):
    return ["-pass", str(n), "-passlogfile", outputFile]
def ffmpegOverwrite():
    return ["-y"]

def ffmpegNoVideo():
    return ["-vn"]
def ffmpegNoAudio():
    return ["-an"]
def ffmpegNoSubtitles():
    return ["-sn"]
def ffmpegNoMetadata():
    return ["-map_metadata", "-1"]


# utility functions
def HMStoS(time):
    if not time:
        return 0.0
    time = time.split(":")
    if len(time) == 3:
        return int(time[0], 10) * 3600 + int(time[1], 10) * 60 + float(time[2])
    elif len(time) == 2:
        return int(time[0], 10) * 60 + float(time[1])
    elif len(time) == 1:
        return float(time[0])
    else:
        return 0.0
def ensurePathExists(path):
    path = os.path.dirname(path)
    if path: os.makedirs(path, exist_ok=True)
def ffmpeg(args):
    if debugFFmpeg not in ('quiet','panic','fatal','error'):
        print(' '.join([ffmpegLocation] + args))
    subprocess.call([ffmpegLocation] + args)


def encodeAudio(ext):
    args_start = ffmpegLoglevel() + ffmpegStartTime() + ffmpegInputFile() + ffmpegEndTime()
    args_audio = ffmpegAudioCodec(ext) + ffmpegAudioQuality() + ffmpegAudioNormalisation()
    args_end = ffmpegThreads() + ffmpegNoVideo() + ffmpegNoSubtitles() + ffmpegNoMetadata() + ffmpegFormat(ext) + ffmpegOverwrite()
    ffmpeg(args_start + args_audio + args_end + ffmpegOutputFile(ext))

def encodeVideo(ext):
    # Get input and calculate output dimensions.
    inWidth, inHeight = getInputDimensions()
    outWidth, outHeight = getOutputDimensions(inWidth, inHeight)

    # H.264 doesn't support odd-sized dimensions, so make sure they're even.
    if ext == "h264":
        if outWidth & 1:
            outWidth -= 1
        if outHeight & 1:
            outHeight -= 1

    args_start = ffmpegLoglevel() + ffmpegStartTime() + ffmpegInputFile() + ffmpegEndTime()
    args_video = ffmpegVideoCodec(ext) + ffmpegVideoQuality() + ffmpegVideoOptions(ext, outWidth, outHeight) + ffmpegVideoFilters(ext, outWidth, outHeight)
    args_end = ffmpegThreads() + ffmpegNoAudio() + ffmpegNoSubtitles() + ffmpegNoMetadata() + ffmpegFormat(ext) + ffmpegOverwrite()

    if use2Pass:
        ffmpeg(args_start + args_video + args_end + ffmpegPass(1) + [os.devnull])
        ffmpeg(args_start + args_video + args_end + ffmpegPass(2) + ffmpegOutputFile(ext))
        try: os.remove(outputFile + "-0.log")
        except OSError: pass
        try: os.remove(outputFile + "-0.log.mbtree") # AV1
        except OSError: pass
    elif useCrf:
        ffmpeg(args_start + args_video + args_end + ffmpegOutputFile(ext))


def mux(baseFile, destinationFile, type):
    ensurePathExists(destinationFile)

    audioFile = baseFile + "." + type.aExt
    videoFile = baseFile + "." + type.vExt
    destinationFile = destinationFile + "." + type.mExt

    if os.path.isfile(audioFile) and os.path.isfile(videoFile):
        # If the muxed file already exists, check that it's older than the
        # current audio and video encodes.
        if os.path.exists(destinationFile) and os.path.isfile(destinationFile):
            destinationLastModifiedTime = os.path.getmtime(destinationFile)
            audioLastModifiedTime = os.path.getmtime(audioFile)
            videoLastModifiedTime = os.path.getmtime(videoFile)

            if destinationLastModifiedTime > max(audioLastModifiedTime, videoLastModifiedTime):
                return os.path.getsize(destinationFile)

        # ffmpeg -i <a> -i <v> -c copy -y <dst>
        args = ffmpegLoglevel() + ["-i", audioFile, "-i", videoFile, "-c", "copy", "-y", destinationFile]
        ffmpeg(args)

        return os.path.getsize(destinationFile)


def extractFonts(video):
    # ffmpeg -dump_attachment:t "" -i <video> -y
    args = ffmpegLoglevel() + ["-dump_attachment:t", "", "-i", video, "-y"]
    ffmpeg(args)

def extractSubtitles(videoFile, subtitleFile, timeStart, timeEnd):
    ensurePathExists(subtitleFile)
    startTime = HMStoS(timeStart)
    endTime = HMStoS(timeEnd)

    # ffmpeg -ss <startTime> -i <videoFile> -t <endTime - startTime> -y <subtitleFile>
    args = ffmpegLoglevel()
    if startTime: args += ["-ss", str(startTime)]
    args += ["-i", videoFile]
    if endTime: args += ["-t", str(endTime - startTime)]
    args += ["-y", subtitleFile]
    ffmpeg(args)

    if os.path.exists(subtitleFile) and os.path.isfile(subtitleFile):
        # PGS (BD subs) can't be converted to ASS, resulting in an empty file.
        if os.path.getsize(subtitleFile) == 0:
            os.remove(subtitleFile)
            return

        # simplify subtitles
        with open(subtitleFile, "r+", encoding="utf8") as f:
            lines = simplifySubtitles(line.strip() for line in f if line)
            f.seek(0)
            print("\n".join(lines), file=f)
            f.truncate()


if __name__ == "__main__":
    import argparse, time

    def timeToHMS(time):
        m, s = divmod(time,60)
        h, m = divmod(m,60)
        return (h,m,s)

    def timeEncode(ext,func):
        print("  encoding", ext, end="", flush=True)
        encodeStart = time.perf_counter()
        func(ext)
        encodeEnd = time.perf_counter()
        hms = timeToHMS(encodeEnd - encodeStart)
        print(" ({:0>2.0f}:{:0>2.0f}:{:0>5.2f})".format(*hms), flush=True)

    # parse arguments
    parser = argparse.ArgumentParser(prefix_chars="-+")
    parser.add_argument("-i", "--ifile", required=True, help="The name of the input file.")
    parser.add_argument("-o", "--ofile", default=outputFile, help="The name to use for the output file.")
    parser.add_argument("-s", "--start", default="0", help="The time to start encoding at.")
    parser.add_argument("-e", "--end", default="0", help="The time to stop encoding at.")
    parser.add_argument("-n", "--noise", default=noiseReduction, choices=("none","light","heavy"), help="How much video noise reduction to use.")
    parser.add_argument("-m", "--mode", default=("2pass" if use2Pass else "crf"), choices=("2pass","crf"), help="The mode to use. Either 2pass or crf.")
    parser.add_argument("-q", "--quality", default=video.default.crf, type=int, help="The CRF value to use if using CRF to encode.")
    parser.add_argument("-f", "--format", default="all", choices=([t.mExt for t in TYPES]+["all","none"]), help="The format of the output file.")
    parser.add_argument("+fonts", action="store_true", help="Add this to also extract fonts.")
    parser.add_argument("+subtitles", action="store_true", help="Add this to also extract subtitles.")
    args = parser.parse_args()

    # convert arguments to variable values
    inputFile = args.ifile
    outputFile = args.ofile
    startTime = HMStoS(args.start)
    endTime = HMStoS(args.end)
    noiseReduction = args.noise
    if args.mode == "2pass":
        use2Pass = True
        useCrf = False
    elif args.mode == "crf":
        use2Pass = False
        useCrf = True
    video.default.crf = str(args.quality)
    if not args.format in ("all","none"):
        TYPES = [t for t in TYPES if t.mExt == args.format]
    elif args.format == "none":
        TYPES = None

    # print settings
    print()
    print("openings.moe 5.5 super comfy encoder!")
    print()
    print("Input file: ", inputFile)
    print("Output file:", outputFile)
    print()
    print("Start Time in Seconds:", startTime)
    print("End Time in Seconds:  ", endTime)
    print()
    if TYPES:
        print("Video Encoder:", ' '.join(t.mExt.upper() for t in TYPES))
        print("  Noise Reduction:", noiseReduction)
        print("  Method: ", ("2-Pass" if use2Pass else "CRF"))
        print("  Quality:", (video.default.bitrate if use2Pass else video.default.crf))
        print()

    timeBeforeStart = time.perf_counter()

    # encode
    if TYPES:
        print("Status:", flush=True)
        ensurePathExists(outputFile)
        LNFilter = ""
        for t in TYPES:
            # encode audio
            if audio.normalize and not LNFilter:
                print("  normalizing audio", flush=True)
                LNFilter = setupAudioNormalization()
            timeEncode(t.aExt,encodeAudio)

            # encode video
            timeEncode(t.vExt,encodeVideo)

            # mux
            print("  combining", t.aExt, "and", t.vExt, flush=True)
            mux(outputFile, outputFile, t)

    # remove audio and video files
    for ext in set(t.aExt for t in TYPES) | set(t.vExt for t in TYPES):
        os.remove(outputFile + "." + ext)

    # extract fonts
    if args.fonts:
        print("extracting fonts", flush=True)
        extractFonts(inputFile)

    # extract subtitles
    if args.subtitles:
        print("extracting subtitles", flush=True)
        extractSubtitles(inputFile, outputFile + ".ass", startTime, endTime)

    timeAfterEnd = time.perf_counter()

    # print time elapsed
    h, m, s = timeToHMS(timeAfterEnd - timeBeforeStart)
    print("\nCompleted in ", end="", flush=True)
    if h != 0: print(int(h), "hours, ", end="", flush=True)
    if h != 0 or m != 0:
        print(int(m), "minutes" + ("" if h == 0 and m != 0 else ",") + " and ", end="", flush=True)
    print(round(s,2), "seconds", flush=True)
