#!/usr/bin/env python3

import os, subprocess, math
from subtitleConverter import convert as simplifySubtitles
from settings import debugVideoManager, use2Pass, useCrf, threads, ffprobeLocation, ffmpegLocation, video, audio, debugFFmpeg, TYPES

# Constants
LIGHT_NOISE_REDUCTION = "hqdn3d=0:0:3:3"
HEAVY_NOISE_REDUCTION = "hqdn3d=1.5:1.5:6:6"
LOUD_NORM_ANALYSE = "loudnorm=I=-16:LRA=20:TP=-1:dual_mono=true:linear=true:print_format=json"
LOUD_NORM_FILTER = "loudnorm=I=-16:LRA=20:TP=-1:dual_mono=true:linear=true:measured_I=AAA:measured_LRA=BBB:measured_TP=CCC:measured_thresh=DDD:offset=EEE"


class VideoData:
    def __init__(inputFile, *, outputFile="output", startTime=0.0, endTime=0.0, noiseReduction="none"):
        self.inputFile = inputFile
        self.outputFile = outputFile
        self.startTime = startTime
        self.endTime = endTime
        self.noiseReduction = noiseReduction # none, light, heavy

        self.loudNormFilter = ""
        self.inputWidth = None
        self.inputHeight = None
        self.outputWidth = None
        self.outputHeight = None


def encode(video, encodeDir, types, toPrint):
    videoData = new VideoData(
        inputFile = video.file,
        outputFile = os.path.join(encodeDir, video.parentSeries.parentIP.name, video.parentSeries.name, video.getFileName())
        startTime = HMStoS(video.timeStart),
        endTime = HMStoS(video.timeEnd)
    )

    ensurePathExists(videoData.outputFile)

    toPrint += "Status: "
    printed = False

    # encode audio
    if video.has_audio:
        for t in types:
            if encodeNecessary(video, videoData.outputFile + "." + t.aExt):
                if audio.normalize and not videoData.loudNormFilter:
                    print(toPrint + "audio norm", end="", flush=True)
                    videoData.loudNormFilter = setupAudioNormalization()
                    print(" O ", end="", flush=True)
                    toPrint = ""
                print(toPrint + t.aExt, end="", flush=True)
                encodeAudio(videoData, t.aExt)
                print(" O ",  end="", flush=True)
                toPrint = ""
                printed = True
            else:
                toPrint += t.aExt + " X "

    # encode video
    for t in types:
        toPrint += t.vExt
        if encodeNecessary(video, videoData.outputFile + "." + t.vExt):
            encodeVideo(videoData, t.vExt)
            print(toPrint + " O ",  end="", flush=True)
            toPrint = ""
            printed = True
        else:
            toPrint += " X "

    if debugVideoManager or printed:
        print(toPrint + "\n", flush=True)
    return videoData


def encodeNecessary(video, outputFile):
    if os.path.exists(outputFile) and os.path.isfile(outputFile):
        outputLastModifiedTime = os.path.getmtime(outputFile)
        if outputLastModifiedTime > video.lastModifiedTime:
            return False
    return True
def getInputDimensions(videoData):
    if videoData.inputWidth is None or videoData.inputHeight is None:
        # ffprobe -hide_banner -loglevel panic -select_streams v:0 -show_entries stream=width,height <source>
        cmd = [ffprobeLocation, "-hide_banner", "-loglevel", "panic", "-select_streams", "v:0", "-show_entries", "stream=width,height", videoData.inputFile]
        result = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode("UTF-8").strip().split("\n")

        for line in result:
            if "width" in line:
                width = int(line.split("=")[1],10)
            elif "height" in line:
                height = int(line.split("=")[1],10)

        videoData.inputWidth, videoData.inputHeight = width, height
    return videoData.inputWidth, videoData.inputHeight
def getOutputDimensions(videoData):
    if videoData.outputWidth is None or videoData.outputHeight is None:
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

        videoData.outputWidth, videoData.outputHeight = int(outWidth), int(outHeight)
    return videoData.outputWidth, videoData.outputHeight
def setupAudioNormalization(videoData):
    if videoData.loudNormFilter:
        return videoData.loudNormFilter

    # ffmpeg -ss <start> -i <source> -to <end> -c:a flac -af <LOUD_NORM_ANALYSE> -vn -sn -map_chapters -1 -map_metadata -1 -f null /dev/null
    cmd = [ffmpegLocation] + ffmpegStartTime(videoData) + ffmpegInputFile(videoData) + ffmpegEndTime(videoData) + ["-c:a", "flac", "-af", LOUD_NORM_ANALYSE] \
        + ffmpegNoVideo() + ffmpegNoSubtitles() + ffmpegNoChapters() + ffmpegNoMetadata() + ["-f", "null", os.devnull]
    result = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode("UTF-8").strip().split("\n")

    loudNormFilter = LOUD_NORM_FILTER

    # parse JSON result line-by-line
    for line in result:
        tokens = line.strip().split()
        if len(tokens) != 3: continue
        attribute = tokens[0][1:-1]
        value = tokens[2].replace("\"","").replace(",","")

        if attribute == "input_i":
            loudNormFilter = loudNormFilter.replace("AAA", value)
        elif attribute == "input_lra":
            loudNormFilter = loudNormFilter.replace("BBB", value)
        elif attribute == "input_tp":
            loudNormFilter = loudNormFilter.replace("CCC", value)
        elif attribute == "input_thresh":
            loudNormFilter = loudNormFilter.replace("DDD", value)
        elif attribute == "target_offset":
            loudNormFilter = loudNormFilter.replace("EEE", value)

    return videoData.loudNormFilter = loudNormFilter


# ffmpeg arguments
def ffmpegInputFile(videoData):
    return ["-i", videoData.inputFile]
def ffmpegOutputFile(videoData, ext):
    return [videoData.outputFile + "." + ext]
def ffmpegStartTime(videoData):
    return ["-ss", str(videoData.startTime)] if videoData.startTime > 0 else []
def ffmpegEndTime(videoData):
    # -ss is applied before -i, so you shouldn't use -to here
    return ["-t", str(videoData.endTime - videoData.startTime)] if videoData.endTime > 0 else []

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
def ffmpegVideoOptions(videoData, ext):
    if ext == "vp9":
        return ["-slices", video.VP9.slices, "-speed", video.VP9.speed, "-g", video.VP9.g, "-tile-columns", "6", "-frame-parallel", "0", "-auto-alt-ref", "1", "-row-mt", "1", "-lag-in-frames", "25"]
    elif ext == "h264":
        return ["-preset", video.H264.preset, "-tune", video.H264.tune, "-bufsize", video.H264.bufsize, "-movflags", "+faststart", "-strict", "experimental"]
    elif ext == "av1":
        if video.AV1.useTiles:
            tiles = ["-tiles", str(math.ceil(videoData.outWidth/128)) + "x" + str(math.ceil(videoData.outHeight/128))]
        else: tiles = []
        return ["-cpu-used", video.AV1.cpuUsed, "-g", video.AV1.g] + tiles + ["-frame-parallel", "0", "-auto-alt-ref", "1", "-row-mt", "1", "-lag-in-frames", "25", "-strict", "experimental"]
    else: raise NotImplementedError(f"'{ext}' is not a supported video format")
def ffmpegVideoFilters(videoData, ext):
    filters = f"scale={videoData.outWidth}:{videoData.outHeight}"

    if (videoData.noiseReduction == "light"):
        filters += "," + LIGHT_NOISE_REDUCTION
    elif (videoData.noiseReduction == "heavy"):
        filters += "," + HEAVY_NOISE_REDUCTION

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
def ffmpegAudioNormalisation(videoData):
    return ["-af", videoData.loudNormFilter] if audio.normalize else []

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
def ffmpegPass(videoData, n):
    return ["-pass", str(n), "-passlogfile", videoData.outputFile]
def ffmpegOverwrite():
    return ["-y"]

def ffmpegNoVideo():
    return ["-vn"]
def ffmpegNoAudio():
    return ["-an"]
def ffmpegNoSubtitles():
    return ["-sn"]
def ffmpegNoChapters():
    return ["-map_chapters", "-1"]
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


def encodeAudio(videoData, ext):
    args_start = ffmpegLoglevel() + ffmpegStartTime(videoData) + ffmpegInputFile(videoData) + ffmpegEndTime(videoData)
    args_audio = ffmpegAudioCodec(ext) + ffmpegAudioQuality() + ffmpegAudioNormalisation(videoData)
    args_end = ffmpegThreads() + ffmpegNoVideo() + ffmpegNoSubtitles() + ffmpegNoChapters() + ffmpegNoMetadata() + ffmpegFormat(ext) + ffmpegOverwrite()
    ffmpeg(args_start + args_audio + args_end + ffmpegOutputFile(videoData, ext))

def encodeVideo(videoData, ext):
    # Get input and calculate output dimensions.
    inWidth, inHeight = getInputDimensions(videoData)
    outWidth, outHeight = getOutputDimensions(videoData)

    # H.264 doesn't support odd-sized dimensions, so make sure they're even.
    if ext == "h264":
        if outWidth & 1:
            outWidth -= 1
        if outHeight & 1:
            outHeight -= 1

    args_start = ffmpegLoglevel() + ffmpegStartTime(videoData) + ffmpegInputFile(videoData) + ffmpegEndTime(videoData)
    args_video = ffmpegVideoCodec(ext) + ffmpegVideoQuality() + ffmpegVideoOptions(videoData, ext) + ffmpegVideoFilters(videoData, ext)
    args_end = ffmpegThreads() + ffmpegNoAudio() + ffmpegNoSubtitles() + ffmpegNoChapters() + ffmpegNoMetadata() + ffmpegFormat(ext) + ffmpegOverwrite()

    if use2Pass:
        ffmpeg(args_start + args_video + args_end + ffmpegPass(videoData, 1) + [os.devnull])
        ffmpeg(args_start + args_video + args_end + ffmpegPass(videoData, 2) + ffmpegOutputFile(videoData, ext))
        try: os.remove(videoData.outputFile + "-0.log")
        except OSError: pass
        try: os.remove(videoData.outputFile + "-0.log.mbtree") # AV1
        except OSError: pass
    elif useCrf:
        ffmpeg(args_start + args_video + args_end + ffmpegOutputFile(videoData, ext))


def mux(baseFile, destinationFile, type, has_audio, toPrint):
    ensurePathExists(destinationFile)

    audioFile = baseFile + "." + type.aExt
    videoFile = baseFile + "." + type.vExt
    destinationFile = destinationFile + "." + type.mExt

    if (os.path.isfile(audioFile) if has_audio else True) and os.path.isfile(videoFile):
        # If the muxed file already exists, check that it's older than the
        # current audio and video encodes.
        if os.path.exists(destinationFile) and os.path.isfile(destinationFile):
            destinationLastModifiedTime = os.path.getmtime(destinationFile)
            audioLastModifiedTime = os.path.getmtime(audioFile) if has_audio else 0
            videoLastModifiedTime = os.path.getmtime(videoFile)

            if destinationLastModifiedTime > max(audioLastModifiedTime, videoLastModifiedTime):
                return False, os.path.getsize(destinationFile)

        if toPrint: print(toPrint, flush=True)

        # ffmpeg -i <a> -i <v> -c copy -y <dst>
        args = ffmpegLoglevel() + (["-i", audioFile] if has_audio else []) + ["-i", videoFile, "-c", "copy", "-y", destinationFile]
        ffmpeg(args)

        return True, os.path.getsize(destinationFile)

    # Even if the input files don't exist, the output file might already exist.
    # If it doesn't, this will raise an exception.
    return False, os.path.getsize(destinationFile)


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

    def timeEncode(func, videoData, ext):
        print("  encoding", ext, end="", flush=True)
        encodeStart = time.perf_counter()
        func(videoData, ext)
        encodeEnd = time.perf_counter()
        hms = timeToHMS(encodeEnd - encodeStart)
        print(" ({:0>2.0f}:{:0>2.0f}:{:0>5.2f})".format(*hms), flush=True)

    # parse arguments
    parser = argparse.ArgumentParser(prefix_chars="-+")
    parser.add_argument("-i", "--ifile", required=True, help="The name of the input file.")
    parser.add_argument("-o", "--ofile", default="output", help="The name to use for the output file.")
    parser.add_argument("-s", "--start", default="0", help="The time to start encoding at.")
    parser.add_argument("-e", "--end", default="0", help="The time to stop encoding at.")
    parser.add_argument("-n", "--noise", default="none", choices=("none","light","heavy"), help="How much video noise reduction to use.")
    parser.add_argument("-m", "--mode", default=("2pass" if use2Pass else "crf"), choices=("2pass","crf"), help="The mode to use. Either 2pass or crf.")
    parser.add_argument("-q", "--quality", default=video.default.crf, type=int, help="The CRF value to use if using CRF to encode.")
    parser.add_argument("-f", "--format", default="all", choices=([t.mExt for t in TYPES]+["all","none"]), help="The format of the output file.")
    parser.add_argument("+fonts", action="store_true", help="Add this to also extract fonts.")
    parser.add_argument("+subtitles", action="store_true", help="Add this to also extract subtitles.")
    args = parser.parse_args()

    # convert arguments to variable values
    videoData = new VideoData(
        inputFile = args.ifile,
        outputFile = args.ofile
        startTime = HMStoS(args.start),
        endTime = HMStoS(args.end),
        noiseReduction = args.noise
    )
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
    print("Input file: ", videoData.inputFile)
    print("Output file:", videoData.outputFile)
    print()
    print("Start Time in Seconds:", videoData.startTime)
    print("End Time in Seconds:  ", videoData.endTime)
    print()
    if TYPES:
        print("Video Encoder:", " ".join(t.mExt.upper() for t in TYPES))
        print("  Noise Reduction:", videoData.noiseReduction)
        print("  Method: ", ("2-Pass" if use2Pass else "CRF"))
        print("  Quality:", (video.default.bitrate if use2Pass else video.default.crf))
        print()

    timeBeforeStart = time.perf_counter()

    # encode
    if TYPES:
        print("Status:", flush=True)
        ensurePathExists(videoData.outputFile)
        for t in TYPES:
            # encode audio
            if audio.normalize and not videoData.loudNormFilter:
                print("  normalizing audio", flush=True)
                setupAudioNormalization(videoData)
            timeEncode(encodeAudio, videoData, t.aExt)

            # encode video
            timeEncode(encodeVideo, videoData, t.vExt)

            # mux
            print(f"  combining {t.aExt} and {t.vExt}", flush=True)
            mux(videoData.outputFile, videoData.outputFile, t, True, "")

    # remove audio and video files
    for ext in set(t.aExt for t in TYPES) | set(t.vExt for t in TYPES):
        os.remove(videoData.outputFile + "." + ext)

    # extract fonts
    if args.fonts:
        print("extracting fonts", flush=True)
        extractFonts(videoData.inputFile)

    # extract subtitles
    if args.subtitles:
        print("extracting subtitles", flush=True)
        extractSubtitles(videoData.inputFile, videoData.outputFile + ".ass", videoData.startTime, videoData.endTime)

    timeAfterEnd = time.perf_counter()

    # print time elapsed
    h, m, s = timeToHMS(timeAfterEnd - timeBeforeStart)
    print("\nCompleted in ", end="", flush=True)
    if h != 0: print(int(h), "hours, ", end="", flush=True)
    if h != 0 or m != 0:
        print(int(m), "minutes" + ("" if h == 0 and m != 0 else ",") + " and ", end="", flush=True)
    print(round(s,2), "seconds", flush=True)
