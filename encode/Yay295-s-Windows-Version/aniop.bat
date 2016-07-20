@ECHO OFF
SETLOCAL EnableDelayedExpansion
CLS


REM Variables
IF NOT DEFINED VAVGRATE SET VAVGRATE=3200
IF NOT DEFINED VMAXRATE SET VMAXRATE=3700
IF NOT DEFINED SPEED    SET SPEED=1
IF NOT DEFINED G        SET G=240
IF NOT DEFINED SLICES   SET SLICES=4
IF NOT DEFINED THREADS  SET THREADS=4


REM ###############################################################################################
REM                              Don't change anything below this line
REM ###############################################################################################


SET COMMAND="%1"
SET VMAXRATE=!VMAXRATE!k

IF NOT DEFINED SS SET SS=0
IF NOT DEFINED ET SET ET=0

IF NOT DEFINED CROPX SET CROPX=0
IF NOT DEFINED CROPY SET CROPY=0
IF NOT DEFINED CROPXOFFSET SET CROPXOFFSET=0
IF NOT DEFINED CROPYOFFSET SET CROPYOFFSET=0


IF %COMMAND% == "" (
  ECHO Commands:
  ECHO test      - Test your start and end times without audio.
  ECHO testa     - Test your start and end times with audio.
  ECHO volume    - Get the maximum volumes of the original video and the new video.
  ECHO encode    - Encode the video using settings v4.2+.
  ECHO subtitles - Extract the subtitles from the video file.
  ECHO.
  ECHO Required Variables:
  ECHO FILE        = The relative directory to the input video file.
  ECHO OFN         = The relative directory to the output video file.
  ECHO.
  ECHO Optional Variables:
  ECHO SS          = The opening/ending start time.
  ECHO ET          = The time elapsed since the start time.
  ECHO CROPX       = The number of pixels to remove horizontally.
  ECHO CROPY       = The number of pixels to remove vertically.
  ECHO CROPXOFFSET = The number of pixels to shift the video left.
  ECHO CROPYOFFSET = The number of pixels to shift the video up.
)


IF %COMMAND% == "test" (
  TITLE %OFN% - Test Encode
  IF !ET! == 0 ( ffmpeg -ss !SS! -i %FILE% -c:v libvpx-vp9 -quality realtime -speed 4 -g !G! -slices !SLICES! -vf "crop=iw-!CROPX!:ih-!CROPY!:!CROPXOFFSET!:!CROPYOFFSET!,scale=-1:min(720\,ih)" -threads !THREADS! -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -an -sn -y "TEST %OFN%.webm"
  ) ELSE ffmpeg -ss !SS! -i %FILE% -t !ET! -c:v libvpx-vp9 -quality realtime -speed 4 -g !G! -slices !SLICES! -vf "crop=iw-!CROPX!:ih-!CROPY!:!CROPXOFFSET!:!CROPYOFFSET!,scale=-1:min(720\,ih)" -threads !THREADS! -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -an -sn -y "TEST %OFN%.webm"
)


IF %COMMAND% == "testa" (
  TITLE %OFN% - Test Encode with Audio
  IF !ET! == 0 ( ffmpeg -ss !SS! -i %FILE% -c:v libvpx-vp9 -quality realtime -speed 4 -g !G! -slices !SLICES! -vf "crop=iw-!CROPX!:ih-!CROPY!:!CROPXOFFSET!:!CROPYOFFSET!,scale=-1:min(720\,ih)" -threads !THREADS! -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -sn -y "TEST %OFN%.webm"
  ) ELSE ffmpeg -ss !SS! -i %FILE% -t !ET! -c:v libvpx-vp9 -quality realtime -speed 4 -g !G! -slices !SLICES! -vf "crop=iw-!CROPX!:ih-!CROPY!:!CROPXOFFSET!:!CROPYOFFSET!,scale=-1:min(720\,ih)" -threads !THREADS! -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -sn -y "TEST %OFN%.webm"
)


IF %COMMAND% == "volume" (
  TITLE %OFN% - Volume Check
  SET VOLUME=     ???
  ECHO Maximum Volume:
  IF !ET! == 0 ( ffmpeg -ss !SS! -i %FILE% -af volumedetect -f null NUL 2> %OFN%.vol1
  ) ELSE ffmpeg -ss !SS! -i %FILE% -t !ET! -af volumedetect -f null NUL 2> %OFN%.vol1
  FOR /F "skip=30 tokens=4,5" %%i IN ( %OFN%.vol1 ) DO (
    IF "%%i" == "max_volume:" SET VOLUME=     %%j
  )
  DEl %OFN%.vol1
  ECHO Original = !VOLUME:~-5!dB
  SET VOLUME=     ???
  IF !ET! == 0 ( ffmpeg -i %OFN%.webm -af volumedetect -f null NUL 2> %OFN%.vol2
  ) ELSE ffmpeg -i %OFN%.webm -af volumedetect -f null NUL 2> %OFN%.vol2
  FOR /F "skip=30 tokens=4,5" %%i IN ( %OFN%.vol2 ) DO (
    IF "%%i" == "max_volume:" SET VOLUME=     %%j
  )
  DEl %OFN%.vol2
  ECHO New      = !VOLUME:~-5!dB
)


IF %COMMAND% == "encode" (
  TITLE %OFN% - Encode

  REM Normalize Volume ############################################################################
  ECHO Getting Max Volume - !time!
  IF !ET! == 0 ( ffmpeg -ss !SS! -i %FILE% -af volumedetect -f null NUL 2> %OFN%.log
  ) ELSE ffmpeg -ss !SS! -i %FILE% -t !ET! -af volumedetect -f null NUL 2> %OFN%.log
  FOR /F "skip=30 tokens=4,5" %%i IN ( %OFN%.log ) DO (
    IF "%%i" == "max_volume:" SET VOLUME=%%j
  )
  DEl %OFN%.log
  ECHO.    Max Volume = !VOLUME!dB

  REM Normalize to 0dB (remove the '-' from !VOLUME!)
  REM SET VOLUME=0!VOLUME:~1!

  REM Normalize to -0.4dB using PowerShell (seems to normalize to 0 though).
  FOR /F %%X in ('PowerShell -C "$V=(!VOLUME!*-1-0.4);$V.ToString('##.####')"') DO SET VOLUME=%%X

  ECHO.    Adjusting Volume by !VOLUME!dB
  ECHO.

  REM Minimize Bitrate ############################################################################
  ECHO Minimizing Bitrate - !time!
  IF !ET! == 0 ( ffprobe -i %FILE% -read_intervals !SS! 2> %OFN%.bitrate
  ) ELSE ffprobe -i %FILE% -read_intervals !SS!%%+!ET! 2> %OFN%.bitrate
  FOR /F "tokens=5,6" %%i IN ( %OFN%.bitrate ) DO (
    IF "%%i" == "bitrate:" SET VBITRATE=%%j
  )
  DEL %OFN%.bitrate
  ECHO.     Input Bitrate = !VBITRATE!k
  IF !VBITRATE! GTR !VAVGRATE! SET VBITRATE=!VAVGRATE!
  SET VBITRATE=!VBITRATE!k
  ECHO.    Output Bitrate = !VBITRATE!
  ECHO.

  REM Start Encoding ##############################################################################
  ECHO Pass 1             - !time!
  IF !ET! == 0 ( START "%OFN% - Encode - Pass 1" /W CMD /C ffmpeg -ss !SS! -i %FILE% -pass 1 -c:v libvpx-vp9 -b:v !VBITRATE! -maxrate !VMAXRATE! -speed !SPEED! -g !G! -slices !SLICES! -vf "crop=iw-!CROPX!:ih-!CROPY!:!CROPXOFFSET!:!CROPYOFFSET!,scale=-1:min(720\,ih)" -threads !THREADS! -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -lag-in-frames 25 -an -sn -f webm -y -passlogfile %OFN% NUL
  ) ELSE START "%OFN% - Encode - Pass 1" /W CMD /C ffmpeg -ss !SS! -i %FILE% -t !ET! -pass 1 -c:v libvpx-vp9 -b:v !VBITRATE! -maxrate !VMAXRATE! -speed !SPEED! -g !G! -slices !SLICES! -vf "crop=iw-!CROPX!:ih-!CROPY!:!CROPXOFFSET!:!CROPYOFFSET!,scale=-1:min(720\,ih)" -threads !THREADS! -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -lag-in-frames 25 -an -sn -f webm -y -passlogfile %OFN% NUL
  ECHO Pass 2             - !time!
  IF !ET! == 0 ( START "%OFN% - Encode - Pass 2" /W CMD /C ffmpeg -ss !SS! -i %FILE% -pass 2 -c:v libvpx-vp9 -b:v !VBITRATE! -maxrate !VMAXRATE! -speed !SPEED! -g !G! -slices !SLICES! -vf "crop=iw-!CROPX!:ih-!CROPY!:!CROPXOFFSET!:!CROPYOFFSET!,scale=-1:min(720\,ih)" -af volume=!VOLUME!dB -threads !THREADS! -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -lag-in-frames 25 -c:a libvorbis -b:a 192k -sn -y -passlogfile %OFN% %OFN%.webm
  ) ELSE START "%OFN% - Encode - Pass 2" /W CMD /C ffmpeg -ss !SS! -i %FILE% -t !ET! -pass 2 -c:v libvpx-vp9 -b:v !VBITRATE! -maxrate !VMAXRATE! -speed !SPEED! -g !G! -slices !SLICES! -vf "crop=iw-!CROPX!:ih-!CROPY!:!CROPXOFFSET!:!CROPYOFFSET!,scale=-1:min(720\,ih)" -af volume=!VOLUME!dB -threads !THREADS! -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -lag-in-frames 25 -c:a libvorbis -b:a 192k -sn -y -passlogfile %OFN% %OFN%.webm
  DEL %OFN%-0.log
  ECHO Done               - !time!
)


IF %COMMAND% == "subtitles" (
  TITLE %OFN% - Subtitles
  IF !ET! == 0 ( ffmpeg -ss !SS! -dump_attachment:t "" -i %FILE% -y %OFN%.ass
  ) ELSE ffmpeg -ss !SS! -dump_attachment:t "" -i %FILE% -t !ET! -y %OFN%.ass
)
