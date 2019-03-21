#!/usr/bin/env python3


import os, subprocess, shutil
from videoClasses import IP
from settings import debugVideoManager, TYPES, directories


# Get ID of group to use for all created files and directories.
try:
    import grp # linux only
    groupID = grp.getgrnam("aniop").gr_gid
except:
    groupID = None


# Checks if all videos that passed QA are actually in the encode dir and that those are the only files there
def isEncodeDirClean(videos):
    # Get set of files in encode dir.
    encodedFiles = {file for root, dirs, files in os.walk(directories.encode) for file in files}

    # Get set of expected file extensions.
    expectedAudioExtensions = {t.aExt for t in TYPES}
    expectedVideoExtensions = {t.vExt for t in TYPES}

    # Create set of expected files.
    expectedFiles = set()
    for video in videos:
        if video.passedQA:
            filename = video.getFileName()
            if video.has_audio:
                expectedFiles |= {f"{filename}.{ext}" for ext in expectedAudioExtensions}
            expectedFiles |= {f"{filename}.{ext}" for ext in expectedVideoExtensions}

    missingFiles = expectedFiles - encodedFiles
    extraFiles = encodedFiles - expectedFiles

    if missingFiles:
        print("Expected files missing from encode dir:")
        print("  " + "\n  ".join(sorted(missingFiles)))
    if extraFiles:
        print("Unexpected files in encode dir found:")
        print("  " + "\n  ".join(sorted(extraFiles)))

    return not missingFiles and not extraFiles

# Checks if all videos that were muxed are actually in the deploy dir and that those are the only files there
def isVideoDeployDirClean(videos):
    # Get set of files in deploy dir.
    encodedFiles = {file for root, dirs, files in os.walk(directories.deploy.videos) for file in files}

    # Get set of expected file extensions.
    expectedExtensions = {t.mExt for t in TYPES}

    # Get set of expected file names.
    expectedNames = {video.getFileName() for video in videos if video.passedQA}

    # Create set of expected files.
    expectedFiles = {name + "." + ext for name in expectedNames for ext in expectedExtensions}

    missingFiles = expectedFiles - encodedFiles
    extraFiles = encodedFiles - expectedFiles

    if missingFiles:
        print("Expected files missing from deploy dir:")
        print("  " + "\n  ".join(sorted(missingFiles)))
    if extraFiles:
        print("Unexpected files in deploy dir found:")
        print("  " + "\n  ".join(sorted(extraFiles)))

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
sourceIPDirs = sorted(os.listdir(directories.source))
videos = []
series = []

for ipDir in sourceIPDirs:
    ip = IP(os.path.join(directories.source, ipDir))

    for aSeries in ip.series:
        series.append(aSeries)
        videos.extend(aSeries.videos)


# for printing: <current video>"/<total videos> => "
mstr = f"/{len(videos)} => "


# Encode Videos
print("Encoding:")
for index, video in enumerate(videos, start=1):
    if video.passedQA:
        video.encode(directories.encode, TYPES, f"Encoding video {index}{mstr}{video.getFileName()}\n  ")
    elif debugVideoManager:
        print(f"Skipping video {index}{mstr}{video.getFileName()}")
        print("  Reason: video has not passed QA")
        print()
print()

setDirGroupOwner(directories.encode)

if not isEncodeDirClean(videos):
    raise SystemExit()


print("Not Encoded:")
for video in videos:
    if not video.passedQA:
        print(video.folder)
print()


# Update Video List
videos = [video for video in videos if video.passedQA]
mstr = f"/{len(videos)} => "


# Mux all videos for deployment.
print("Muxing:")
for index, video in enumerate(videos, start=1):
    video.mux(directories.deploy.videos, TYPES, f"Muxing {index}{mstr}{video.getFileName()}")
print()

setDirGroupOwner(directories.deploy.videos)

if not isVideoDeployDirClean(videos):
    raise SystemExit()


# ffmpeg dumps attachments in the folder where you run the command 
# with no options to change that afaik, so we change working dirs to deploy
os.makedirs(directories.attachments, exist_ok=True)
os.chdir(directories.attachments)

# Extract all fonts for deployment.
print("Extracting Fonts:")
for index, video in enumerate(videos, start=1):
    video.extractFonts(f"Extracting fonts {index}{mstr}{video.getFileName()}")
print()

setDirGroupOwner(directories.attachments)

os.makedirs(directories.text, exist_ok=True)

# Get the fonts from the attachments, remove duplicates, and convert them to various formats.
# Returns a string to be dumped into a css file containing @font-face declarations.
# "-quiet" doesn't actually seem to do anything, but I've kept it in case it does.
if shutil.which("fontforge"): # check that fontforge is available
    os.makedirs(directories.deploy.fonts, exist_ok=True)
    css = subprocess.check_output(["fontforge", "-quiet", "-script", "fontConverter.py", directories.attachments, directories.deploy.fonts])
    css = css[css.find("@font-face"):]
    with open(os.path.join(directories.text, "fonts.css"), "w", encoding="UTF-8") as fontFile:
        fontFile.write(css)
setDirGroupOwner(directories.deploy.fonts)


# Extract all subtitles for deployment.
print("Extracting Subtitles:")
for index, video in enumerate(videos, start=1):
    video.extractSubtitles(directories.deploy.subtitles, f"Extracting subtitles {index}{mstr}{video.getFileName()}")
print()

setDirGroupOwner(directories.deploy.subtitles)


# Generate CSV
with open(os.path.join(directories.text, "videos.csv"), "w", encoding="UTF-8") as csv:
    for video in videos:
        csv.write(video.getCSVLine())

# Generate names.php
with open(os.path.join(directories.text, "names.php"), "w", encoding="UTF-8") as php:
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
        os.chown(os.path.join(directories.text, "videos.csv"), -1, groupID)
        os.chmod(os.path.join(directories.text, "videos.csv"), 0o660)
    except: pass
    try:
        os.chown(os.path.join(directories.text, "names.php"), -1, groupID)
        os.chmod(os.path.join(directories.text, "names.php"), 0o660)
    except: pass
