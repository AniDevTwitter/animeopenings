import os, subprocess, errno
from subtitleConverter import convert as simplifySubtitles

# Constants
lightNoiseReduction = "hqdn3d=0:0:3:3"
heavyNoiseReduction = "hqdn3d=1.5:1.5:6:6"
loudNormAnalyse = "loudnorm=I=-16:LRA=20:TP=-1:dual_mono=true:linear=true:print_format=json"
loudNormFilter = "loudnorm=I=-16:LRA=20:TP=-1:dual_mono=true:linear=true:measured_I=AAA:measured_LRA=BBB:measured_TP=CCC:measured_thresh=DDD:offset=EEE"


# Method Switches
use2Pass = False
useCrf = True
useAudioNorm = True

# Configuration
threads = "8" # The number of cores/threads your CPU has. Probably 4.

# VP9 Configuration
VP9_slices = "4"
VP9_g = "240"
VP9_speed = "1" # 0 == slow + higher quality, 4 == fast + lower quality

# H.264 Configuration
H264_preset = "placebo" # ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow, placebo
H264_tune = "animation" # film, animation, grain, stillimage, psnr, ssim, fastdecode, zerolatency
H264_bufsize = "2M"

# Globals
inputFile = ""
outputFile = "output"
startTime = 0.0
endTime = 0.0
videoBitrate = "3000K"
maxVideoBitrate = "3700k"
noiseReduction = "none"
videoResolution = "720"
audioSampleRate = "48k"
audioBitrate = "192k"
crf = "18"
LNFilter = ""
shutUp = True


def encode(video, encodeDir, types):
    global outputFile, inputFile, startTime, endTime, LNFilter

    outputFile = os.path.join(encodeDir, video.parentSeries.parentIP.name, video.parentSeries.name, video.getFileName())
    inputFile = video.file
    startTime = HMStoS(video.timeStart)
    endTime = HMStoS(video.timeEnd)

    print("Status: ",  end="", flush=True)
    makeSurePathExists(os.path.dirname(outputFile))

    # encode audio
    LNFilter = ""
    for t in types:
        if encodeNecessary(video, outputFile + "." + t.aExt):
            if useAudioNorm and not LNFilter:
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
def setupAudioNormalization():
    # ffmpeg -ss <start> -i <source> -to <end> -threads <threads> -c:a flac -af <loudNormAnalyse> -vn -sn -map_metadata -1 -f null /dev/null
    cmd = ["ffmpeg"] + ffmpegStartTime() + ffmpegInputFile() + ffmpegEndTime() + ["-c:a", "flac", "-af", loudNormAnalyse] \
        + ffmpegNoVideo() + ffmpegNoSubtitles() + ffmpegNoMetadata() + ["-f", "null", os.devnull]
    result = subprocess.check_output(cmd, stderr=subprocess.STDOUT).decode("UTF-8").strip().split("\n")

    # NOT global
    LNFilter = loudNormFilter

    # Magic string fuckery
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
    return ["-to", str(endTime)] if endTime > 0 else []

def ffmpegVideoCodec(ext):
    if ext == "vp9":
        return ["-c:v", "libvpx-vp9"]
    elif ext == "h264":
        return ["-c:v", "libx264"]
    else: raise NotImplementedError("'" + ext + "' is not a supported video codec")
def ffmpegVideoQuality():
    if use2Pass:
        return ["-b:v", videoBitrate, "-maxrate", maxVideoBitrate]
    elif useCrf: #VP9 uses b:v for rate limiting in this case
        return ["-crf", crf, "-b:v", maxVideoBitrate, "-maxrate", maxVideoBitrate]
    else: raise ValueError("You must use one of 2-Pass or CRF")
def ffmpegVideoOptions(ext):
    if ext == "vp9":
        return ["-slices",  VP9_slices, "-speed", VP9_speed, "-g", VP9_g, "-tile-columns", "6", "-frame-parallel", "0", "-auto-alt-ref", "1", "-lag-in-frames", "25"]
    elif ext == "h264":
        return ["-preset", H264_preset, "-tune", H264_tune, "-bufsize", H264_bufsize, "-movflags", "+faststart", "-strict", "-2"]
    else: raise NotImplementedError("'" + ext + "' is not a supported video format")
def ffmpegVideoFilters():
    filters = "scale=-2:min("+ videoResolution +"\,ih)"

    if (noiseReduction == "light"):
        filters += "," + lightNoiseReduction
    elif (noiseReduction == "heavy"):
        filters += "," + heavyNoiseReduction

    return ["-vf", filters]

def ffmpegAudioCodec(ext):
    if ext == "vorbis":
        return ["-c:a", "libvorbis"]
    elif ext == "opus":
        return ["-c:a", "libopus"]
    elif ext == "aac":
        return ["-c:a", "aac"]
    else: raise NotImplementedError("'" + ext + "' is not a supported audio codec")
def ffmpegAudioQuality():
    return ["-ar", audioSampleRate, "-b:a", audioBitrate, "-ac", "2"]
def ffmpegAudioNormalisation():
    return ["-af", LNFilter] if useAudioNorm else []

def ffmpegLoglevel():
    return ["-loglevel", "panic"] if shutUp else []
def ffmpegThreads():
    return ["-threads", threads]
def ffmpegFormat(ext):
    if ext in ("vorbis", "opus"):
        return ["-f", "ogg"]
    elif ext in ("aac", "h264"):
        return ["-f", "mp4"]
    elif ext == "vp9":
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
    if time == "":
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
def makeSurePathExists(path):
    try:
        if path != "":
            os.makedirs(path)
    except OSError as exception:
        if exception.errno != errno.EEXIST:
            raise
def ffmpeg(args):
    subprocess.call(["ffmpeg"] + args)


def encodeAudio(ext):
    args_start = ffmpegLoglevel() + ffmpegStartTime() + ffmpegInputFile() + ffmpegEndTime()
    args_audio = ffmpegAudioCodec(ext) + ffmpegAudioQuality() + ffmpegAudioNormalisation()
    args_end = ffmpegThreads() + ffmpegNoVideo() + ffmpegNoSubtitles() + ffmpegNoMetadata() + ffmpegFormat(ext) + ffmpegOverwrite()
    ffmpeg(args_start + args_audio + args_end + ffmpegOutputFile(ext))

def encodeVideo(ext):
    args_start = ffmpegLoglevel() + ffmpegStartTime() + ffmpegInputFile() + ffmpegEndTime()
    args_video = ffmpegVideoCodec(ext) + ffmpegVideoQuality() + ffmpegVideoOptions(ext) + ffmpegVideoFilters()
    args_end = ffmpegThreads() + ffmpegNoAudio() + ffmpegNoSubtitles() + ffmpegNoMetadata() + ffmpegFormat(ext) + ffmpegOverwrite()

    if use2Pass:
        ffmpeg(args_start + args_video + args_end + ffmpegPass(1) + [os.devnull])
        ffmpeg(args_start + args_video + args_end + ffmpegPass(2) + ffmpegOutputFile(ext))
        os.remove(outputFile + "-0.log")
    elif useCrf:
        ffmpeg(args_start + args_video + args_end + ffmpegOutputFile(ext))


def mux(baseFile, destinationFile, type):
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
    # ffmpeg -dump_attachment:t "" -i <video> -n
    args = ["-loglevel", "panic", "-dump_attachment:t", "", "-i", video, "-n"]
    ffmpeg(args)

def extractSubtitles(videoFile, subtitleFile, timeStart, timeEnd):
    # ffmpeg -ss <start_time> -i <videoFile> -to <end_time> -y <subtitleFile>
    args = ffmpegLoglevel()
    if timeStart: args += ["-ss", timeStart]
    args += ["-i", videoFile]
    if timeEnd: args += ["-to", timeEnd]
    args += ["-y", subtitleFile]
    ffmpeg(args)

    if os.path.exists(subtitleFile) and os.path.isfile(subtitleFile):
        # PGS (BD subs) can't be converted to ass, resulting in an empty file.
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
    from videoClasses import Type
    import argparse

    # audio extension, video extension, muxed extension, mime type
    MP4 = Type("aac", "h264", "mp4", "'video/mp4'")
    WEBM = Type("opus", "vp9", "webm", "'video/webm;codecs=\"vp9,opus\"'")
    TYPES = (MP4,WEBM)

    # parse arguments
    parser = argparse.ArgumentParser(prefix_chars="-+")
    parser.add_argument("-i", "--ifile", required=True, help="The name of the input file.")
    parser.add_argument("-o", "--ofile", default=outputFile, help="The name to use for the output file.")
    parser.add_argument("-s", "--start", default="0", help="The time to start encoding at.")
    parser.add_argument("-e", "--end", default="0", help="The time to stop encoding at.")
    parser.add_argument("-n", "--noise", default=noiseReduction, choices=("none","light","heavy"), help="How much video noise reduction to use.")
    parser.add_argument("-m", "--mode", default=("2pass" if use2Pass else "crf"), choices=("2pass","crf"), help="The mode to use. Either 2pass or crf.")
    parser.add_argument("-q", "--quality", default=crf, type=int, help="The CRF value to use if using CRF to encode.")
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
    crf = str(args.quality)
    if not args.format in ("all","none"):
        TYPES = (t for t in TYPES if t.mExt == args.format)
    elif args.format == "none":
        TYPES = None

    # print settings
    print()
    print("openings.moe 6.0 super comfy encoder!")
    print()
    print("Input file:  " + inputFile)
    print("Output file: " + outputFile)
    print()
    print("Start Time in Seconds: " + str(startTime))
    print("End Time in Seconds:   " + str(endTime))
    print()
    if TYPES:
        print("Video Encoder: " + ' '.join(t.mExt.upper() for t in TYPES))
        print("  Noise Reduction: " +  noiseReduction)
        print("  Method:  " +  ("2-Pass" if use2Pass else "CRF"))
        print("  Quality: " +  (videoBitrate if use2Pass else crf))
        print()

    # encode
    if TYPES:
        print("Status: ",  end="", flush=True)
        makeSurePathExists(os.path.dirname(outputFile))
        LNFilter = ""
        for t in TYPES:
            # encode audio
            if useAudioNorm and not LNFilter:
                print("normalizing audio", flush=True)
                LNFilter = setupAudioNormalization()
            print("encoding", t.aExt, flush=True)
            encodeAudio(t.aExt)

            # encode video
            print("encoding", t.vExt, flush=True)
            encodeVideo(t.vExt)

            # mux
            print("combining", t.aExt, "and", t.vExt, flush=True)
            mux(outputFile, outputFile, t)

    # extract fonts
    if args.fonts:
        print("extracting fonts", flush=True)
        extractFonts(inputFile)

    # extract subtitles
    if args.subtitles:
        print("extracting subtitles", flush=True)
        extractSubtitles(inputFile, outputFile + ".ass", startTime, endTime)
