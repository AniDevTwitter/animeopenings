#!/usr/bin/env python3


import os, subprocess, shutil
from videoClasses import Type, IP


baseDir = os.path.abspath(os.path.join(os.path.sep, "mnt", "sdb", "openings.moe"))
textDir = os.path.join(baseDir, "bin")
sourceDir = os.path.join(baseDir, "source")
encodeDir = os.path.join(baseDir, "encode")
deployDir = os.path.join(baseDir, "deploy")
videoDeployDir = os.path.join(deployDir, "videos")
fontDeployDir = os.path.join(deployDir, "fonts")
subtitleDeployDir = os.path.join(deployDir, "subtitles")
attachmentDumpDir = os.path.join(baseDir, "attachments")


# Get ID of group to use for all created files and directories.
try:
    import grp # linux only
    groupID = grp.getgrnam("aniop").gr_gid
except:
    groupID = None

# audio extension, video extension, muxed extension, mime type
MP4 = Type("aac", "h264", "mp4", "'video/mp4'")
WEBM = Type("opus", "vp9", "webm", "'video/webm;codecs=\"vp9,opus\"'")
TYPES = (MP4,WEBM)


# Checks if all videos that passed QA are actually in the encode dir and that those are the only files there
def isEncodeDirClean(videos):
    # Get set of files in encode dir.
    encodedFiles = {file for root, dirs, files in os.walk(encodeDir) for file in files}

    # Get set of expected file extensions.
    expectedExtensions = {x for t in TYPES for x in [t.aExt,t.vExt]}

    # Get set of expected file names.
    expectedNames = {video.getFileName() for video in videos if video.passedQA}

    # Create set of expected files.
    expectedFiles = {name + "." + ext for name in expectedNames for ext in expectedExtensions}

    missingFiles = expectedFiles - encodedFiles
    extraFiles = encodedFiles - expectedFiles

    if missingFiles:
        print("Expected files missing from encode dir: " + str(missingFiles)[1:-1])
    if extraFiles:
        print("Unexpected files in encode dir found: " + str(extraFiles)[1:-1])

    return not missingFiles and not extraFiles

# Checks if all videos that were muxed are actually in the deploy dir and that those are the only files there
def isVideoDeployDirClean(videos):
    # Get set of files in deploy dir.
    encodedFiles = {file for root, dirs, files in os.walk(videoDeployDir) for file in files}

    # Get set of expected file extensions.
    expectedExtensions = {t.mExt for t in TYPES}

    # Get set of expected file names.
    expectedNames = {video.getFileName() for video in videos if video.passedQA}

    # Create set of expected files.
    expectedFiles = {name + "." + ext for name in expectedNames for ext in expectedExtensions}

    missingFiles = expectedFiles - encodedFiles
    extraFiles = encodedFiles - expectedFiles

    if missingFiles:
        print("Expected files missing from deploy dir: " + str(missingFiles)[1:-1])
    if extraFiles:
        print("Unexpected files in deploy dir found: " + str(extraFiles)[1:-1])

    return not missingFiles and not extraFiles

# Change the group owner of all files and directories under the given path.
def setDirGroupOwner(path):
    if groupID:
        for root, dirs, files in os.walk(path):  
            for dir in dirs:
                try:
                    os.chown(os.path.join(root, dir), -1, groupID)
                    os.chmod(os.path.join(root, dir), 0o770)
                except: pass
            for file in files:
                try:
                    os.chown(os.path.join(root, file), -1, groupID)
                    os.chmod(os.path.join(root, file), 0o660)
                except: pass
    else: # Windows equivalent?
        pass


# main
sourceIPDirs = sorted(os.listdir(sourceDir))
videos = []
series = []

for ipDir in sourceIPDirs:
    ip = IP(os.path.join(sourceDir, ipDir))

    for aSeries in ip.series:
        series.append(aSeries)
        videos.extend(aSeries.videos)


# Encode Videos
vlens = "/" + str(len(videos))
for index, video in enumerate(videos, start=1):
    if video.passedQA:
        print("===> Encoding video", str(index) + vlens, video.getFileName())
        video.encode(encodeDir, TYPES)
    else:
        print("===> Skipping video", str(index) + vlens, video.getFileName())
        print("Reason: video has not passed QA")
        print()

setDirGroupOwner(encodeDir)

if not isEncodeDirClean(videos):
    raise SystemExit()


print("Not Encoded:")
for video in videos:
    if not video.passedQA:
        print(video.file)
print()


# Update Video List
videos = [video for video in videos if video.passedQA]

# for printing: <current video>"/<total videos> => "
mstr = "/" + str(len(videos)) + " => "


# Mux all videos for deployment.
for index, video in enumerate(videos, start=1):
    print("Muxing " + str(index) + mstr + video.getFileName())
    video.mux(videoDeployDir, TYPES)

setDirGroupOwner(videoDeployDir)

if not isVideoDeployDirClean(videos):
    raise SystemExit()


# ffmpeg dumps attachments in the folder where you run the command 
# with no options to change that afaik, so we change working dirs to deploy
os.makedirs(attachmentDumpDir, exist_ok=True)
os.chdir(attachmentDumpDir)

# Extract all fonts for deployment.
for index, video in enumerate(videos, start=1):
    print("Extracting fonts " + str(index) + mstr + video.getFileName())
    video.extractFonts()

setDirGroupOwner(attachmentDumpDir)

os.makedirs(textDir, exist_ok=True)

# Get the fonts from the attachments, remove duplicates, and convert them to various formats.
# Returns a string to be dumped into a css file containing @font-face declarations.
# "-quiet" doesn't actually seem to do anything, but I've kept it in case it does.
if shutil.which("fontforge"): # check that fontforge is available
    os.makedirs(fontDeployDir, exist_ok=True)
    css = subprocess.check_output(["fontforge", "-quiet", "-script", "fontConverter.py", attachmentDumpDir, fontDeployDir])
    css = css[css.find("@font-face"):]
    with open(os.path.join(textDir, "fonts.css"), "w", encoding="UTF-8") as fontFile:
        fontFile.write(css)
setDirGroupOwner(fontDeployDir)


# Extract all subtitles for deployment.
for index, video in enumerate(videos, start=1):
    print("Extracting subtitles " + str(index) + mstr + video.getFileName())
    video.extractSubtitles(subtitleDeployDir)

setDirGroupOwner(subtitleDeployDir)


# Generate CSV
with open(os.path.join(textDir, "videos.csv"), "w", encoding="UTF-8") as csv:
    for video in videos:
        csv.write(video.getCSVLine())

# Generate names.php
with open(os.path.join(textDir, "names.php"), "w", encoding="UTF-8") as php:
    phpData = "<?php $names = ["

    for aSeries in series:
        if aSeries.hasApprovedVideos():
            phpData += aSeries.getPHP() + ",\n"

    # Remove the last comma and newline.
    phpData = phpData[:-2]
    phpData += "\n]; ?>\n"
    php.write(phpData)


if groupID:
    try:
        os.chown(os.path.join(textDir, "videos.csv"), -1, groupID)
        os.chmod(os.path.join(textDir, "videos.csv"), 0o660)
    except: pass
    try:
        os.chown(os.path.join(textDir, "names.php"), -1, groupID)
        os.chmod(os.path.join(textDir, "names.php"), 0o660)
    except: pass
