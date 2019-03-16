import os
from types import SimpleNamespace as NS


# Method Switches
use2Pass = False
useCrf = not use2Pass

# Debugging Switches
debugVideoManager = False
debugFFmpeg = "panic" # quiet, panic, fatal, error, warning, info, verbose, debug, trace
debugFontConverter = False

# FFprobe/FFmpeg Settings
threads = "8" # The number of cores/threads your CPU has. Probably 4.
ffprobeLocation = "ffprobe" # Change this if ffprobe isn't in your path.
# ffprobeLocation = os.path.realpath("./ffprobe") # If you have ffprobe as a local binary.
ffmpegLocation = "ffmpeg" # Change this if ffmpeg isn't in your path.
# ffmpegLocation = os.path.realpath("./ffmpeg") # If you have ffmpeg as a local binary.


# The directories where everything is and should be located.
_baseDir = os.path.abspath(os.path.join(os.path.sep, "mnt", "sdb", "openings.moe"))
_deployDir = os.path.join(_baseDir, "deploy")
directories = NS(
	text = os.path.join(_baseDir, "bin"),
	source = os.path.join(_baseDir, "source"),
	encode = os.path.join(_baseDir, "encode"),
	deploy = NS(
		videos = os.path.join(_deployDir, "videos"),
		fonts = os.path.join(_deployDir, "fonts"),
		subtitles = os.path.join(_deployDir, "subtitles")
	),
	attachments = os.path.join(_baseDir, "attachments")
)


# Video Settings
video = NS(
	default = NS(
		bitrate = "3000K",
		crf = "18",
		maxBitrate = "5000k",
		maxWidth = 1280,
		maxHeight = 720
	),

	# VP9 Configuration
	VP9 = NS(
		slices = "4",
		g = "240",  # Max number of frames between keyframes.
		speed = "1" # 0 == slow + higher quality, 4 == fast + lower quality
	),

	# H.264 Configuration
	H264 = NS(
		preset = "veryslow", # ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow, placebo
		tune = "animation",  # film, animation, grain, stillimage, psnr, ssim, fastdecode, zerolatency
		bufsize = "2M"
	),

	# AV1 Configuration
	AV1 = NS(
		cpuUsed = "1",  # 0 == slow + higher quality, 8 == fast + lower quality
		g = "240",
		useTiles = True # The tiles used are calculated based on the input video size.
	)
)

# Audio Settings
audio = NS(
	normalize = True,
	sampleRate = "48k",
	bitrate = "192k"
)


# The formats to encode to.
class Type:
    def __init__(self, audioExt, videoExt, muxedExt, mime):
        self.aExt = audioExt
        self.vExt = videoExt
        self.mExt = muxedExt
        self.mime = mime

_MP4 = Type("aac", "h264", "mp4", "'video/mp4'")
_WEBM = Type("opus", "vp9", "webm", "'video/webm;codecs=\"vp9,opus\"'")
_AV1 = Type("opus", "av1", "av1.webm", "'video/webm;codecs=\"av1,opus\"'")

# TYPES = (_MP4,_WEBM,_AV1)
TYPES = (_MP4,_WEBM)
