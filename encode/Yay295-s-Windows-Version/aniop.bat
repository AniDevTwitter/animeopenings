@ECHO OFF
SETLOCAL EnableDelayedExpansion
CLS


REM Variables
SET VBITRATE=3200k
SET VMAXRATE=3700k
SET SPEED=1
SET G=240
SET SLICES=4
SET THREADS=4


SET COMMAND="%1"

IF %COMMAND% == "" (
  ECHO Commands:
  ECHO test   - Test your start and end times without audio.
  ECHO testa  - Test your start and end times with audio.
  ECHO volume - Get the maximum volumes of the original video and the new video.
  ECHO encode - Encode the video using settings v4.2.
  ECHO.
  ECHO Required Variable Descriptions:
  ECHO FILE = The relative directory to the input video file.
  ECHO SS   = The opening/ending start time.
  ECHO ET   = The time elapsed since the start time.
  ECHO OFN  = The relative directory to the output video file.
)

IF %COMMAND% == "test" (
  ffmpeg -ss %SS% -i %FILE% -t %ET% -c:v libvpx-vp9 -quality realtime -speed 4 -g %G% -slices %SLICES% -vf "scale=-1:min(720\,ih)" -threads %THREADS% -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -an -sn -y "TEST %OFN%.webm"
)

IF %COMMAND% == "testa" (
  ffmpeg -ss %SS% -i %FILE% -t %ET% -c:v libvpx-vp9 -quality realtime -speed 4 -g %G% -slices %SLICES% -vf "scale=-1:min(720\,ih)" -threads %THREADS% -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -sn -y "TEST %OFN%.webm"
)

IF %COMMAND% == "volume" (
  SET VOLUME=     ???
  ECHO Maximum Volume:
  ffmpeg -ss %SS% -i %FILE% -t %ET% -af volumedetect -f null NUL 2> %OFN%.vol1
  FOR /F "skip=30 tokens=4,5" %%i IN ( %OFN%.vol1 ) DO (
    IF "%%i" == "max_volume:" SET VOLUME=     %%j
  )
  DEl %OFN%.vol1
  ECHO Original = !VOLUME:~-5!dB
  SET VOLUME=     ???
  ffmpeg -i %OFN%.webm -af volumedetect -f null NUL 2> %OFN%.vol2
  FOR /F "skip=30 tokens=4,5" %%i IN ( %OFN%.vol2 ) DO (
    IF "%%i" == "max_volume:" SET VOLUME=     %%j
  )
  DEl %OFN%.vol2
  ECHO New      = !VOLUME:~-5!dB
)

IF %COMMAND% == "encode" (
  ECHO Getting Max Volume - !time!
  ffmpeg -ss %SS% -i %FILE% -t %ET% -af volumedetect -f null NUL 2> %OFN%.log
  FOR /F "skip=30 tokens=4,5" %%i IN ( %OFN%.log ) DO (
    IF "%%i" == "max_volume:" SET VOLUME=%%j
  )
  DEl %OFN%.log
  ECHO.    Max Volume = !VOLUME!dB

  REM Normalize to 0dB (remove the '-' from %VOLUME%)
  REM SET VOLUME=!VOLUME:~1!

  REM Normalize to -0.4dB (seems to normalize to 0 though).
  PowerShell -C !VOLUME!*-1-0.4 > %OFN%.tmp
  SET /P VOLUME=<%OFN%.tmp
  DEl %OFN%.tmp

  ECHO.    Adjusting Volume by !VOLUME!dB
  ECHO Pass 1             - !time!
  START /W CMD /C ffmpeg -ss %SS% -i %FILE% -t %ET% -pass 1 -c:v libvpx-vp9 -b:v %VBITRATE% -maxrate %VMAXRATE% -speed %SPEED% -g %G% -slices %SLICES% -vf "scale=-1:min(720\,ih)" -threads %THREADS% -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -lag-in-frames 25 -an -sn -f webm -y -passlogfile %OFN% NUL
  ECHO Pass 2             - !time!
  START /W CMD /C ffmpeg -ss %SS% -i %FILE% -t %ET% -pass 2 -c:v libvpx-vp9 -b:v %VBITRATE% -maxrate %VMAXRATE% -speed %SPEED% -g %G% -slices %SLICES% -vf "scale=-1:min(720\,ih)" -af volume=!VOLUME!dB -threads %THREADS% -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -lag-in-frames 25 -c:a libvorbis -b:a 192k -sn -y -passlogfile %OFN% %OFN%.webm
  DEL %OFN%-0.log
  ECHO Done               - !time!
)
