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

REM Escape Exclamation Marks
SET FILE=!FILE:^^!=^^^^!!
SET OFN=!OFN:^^!=^^^^!!

IF NOT DEFINED SS SET SS=0
IF NOT DEFINED ET SET ET=0
IF !ET! == 0 (
  ffprobe -i !FILE! -show_entries format=duration -v quiet -of csv="p=0" > !OFN!.length
  FOR /F %%X in ( !OFN!.length ) DO SET ET=%%X
  DEL !OFN!.length
)

IF NOT DEFINED CROPX SET CROPX=0
IF NOT DEFINED CROPY SET CROPY=0
IF NOT DEFINED CROPXOFFSET SET CROPXOFFSET=0
IF NOT DEFINED CROPYOFFSET SET CROPYOFFSET=0

IF DEFINED YADIF (
  IF !YADIF! EQU 0 (
    SET YADIF=
  ) ELSE IF !YADIF! EQU 1 SET YADIF=yadif,
) ELSE SET YADIF=

REM loudnorm settings
SET LN_I=-16
SET LN_LRA=20
SET LN_TP=-1

IF NOT DEFINED AFILTER SET AFILTER=


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
  ECHO YADIF       = Set to 1 to deinterlace, 0 to not [default].
  ECHO AFILTER     = Appended to the audio filter settings.
)


IF %COMMAND% == "test" (
  TITLE !OFN! - Test Encode
  ffmpeg -ss !SS! -i !FILE! -t !ET! -threads %THREADS% -c:v libvpx-vp9 -quality realtime -speed 4 -g !G! -slices !SLICES! -vf "!YADIF!crop=iw-!CROPX!:ih-!CROPY!:!CROPXOFFSET!:!CROPYOFFSET!,scale=-1:min(720\,ih-!CROPY!)" -tile-columns 6 -frame-parallel 0 -auto-alt-ref 1 -an -sn -y "TEST !OFN!.webm"
  WAITFOR /S %COMPUTERNAME% /SI aniopTestDone >NUL
)


IF %COMMAND% == "testa" (
  TITLE !OFN! - Test Encode with Audio

  ECHO Normalizing Audio  - !time!
  SET LOUDNORMSTR^=I=%LN_I%:LRA=%LN_LRA%:TP=%LN_TP%:dual_mono=true:linear=true
  ffmpeg -ss %SS% -i !FILE! -t %ET% -threads %THREADS% -vn -af loudnorm=!LOUDNORMSTR!:print_format=json -sn -f null NUL 2> !OFN!.loudnorm
  SET LOUDNORMSTR^=!LOUDNORMSTR!:measured_I=AAA:measured_LRA=BBB:measured_TP=CCC:measured_thresh=DDD:offset=EEE
  FOR /F "tokens=1,3" %%i IN ( !OFN!.loudnorm ) DO (
    SET X=%%j
    SET Y=     !X:~1,-1!
    IF %%i == "input_i" (
      CALL SET LOUDNORMSTR=%%LOUDNORMSTR:AAA=!X:~1,-2!%%
	    ECHO.    Input Integrated Loudness: !Y:~-7,6!
    )
    IF %%i == "input_lra" (
      CALL SET LOUDNORMSTR=%%LOUDNORMSTR:BBB=!X:~1,-2!%%
	    ECHO.    Input Loudness Range:      !Y:~-7,6!
    )
    IF %%i == "input_tp" (
      CALL SET LOUDNORMSTR=%%LOUDNORMSTR:CCC=!X:~1,-2!%%
      ECHO.    Input True Peak:           !Y:~-7,6!
    )
    IF %%i == "input_thresh" (
      CALL SET LOUDNORMSTR=%%LOUDNORMSTR:DDD=!X:~1,-2!%%
      ECHO.    Input Threshold:           !Y:~-7,6!
    )
    IF %%i == "target_offset" (
      CALL SET LOUDNORMSTR=%%LOUDNORMSTR:EEE=!X:~1,-1!%%
      ECHO.    Target Offset:             !Y:~-6!
    )
  )
  DEL !OFN!.loudnorm
  ECHO.

  ECHO Encoding           - !time!
  ffmpeg -ss !SS! -i !FILE! -t !ET! -threads %THREADS% -c:v libvpx-vp9 -quality realtime -speed 4 -g !G! -slices !SLICES! -vf "!YADIF!crop=iw-!CROPX!:ih-!CROPY!:!CROPXOFFSET!:!CROPYOFFSET!,scale=-1:min(720\,ih-!CROPY!)" -tile-columns 6 -frame-parallel 0 -auto-alt-ref 1 -c:a libvorbis -af loudnorm=!LOUDNORMSTR!!AFILTER! -sn -y "TEST !OFN!.webm"
  ECHO.

  ECHO Done               - !time!
  WAITFOR /S %COMPUTERNAME% /SI aniopTestADone >NUL
)


IF %COMMAND% == "volume" (
  TITLE !OFN! - Volume Check
  SET VOLUME=     ???
  ECHO Maximum Volume:
  ffmpeg -ss !SS! -i !FILE! -t !ET! -threads !THREADS! -vn -af volumedetect -f null NUL 2> !OFN!.volume
  FOR /F "tokens=4,5" %%i IN ( !OFN!.volume ) DO (
    IF "%%i" == "max_volume:" SET VOLUME=     %%j
  )
  DEl !OFN!.volume
  ECHO Original: !VOLUME:~-5!dB
  SET VOLUME=     ???
  ffmpeg -i !OFN!.webm -threads !THREADS! -vn -af volumedetect -f null NUL 2> !OFN!.volume
  FOR /F "tokens=4,5" %%i IN ( !OFN!.volume ) DO (
    IF "%%i" == "max_volume:" SET VOLUME=     %%j
  )
  DEl !OFN!.volume
  ECHO New:      !VOLUME:~-5!dB

  ECHO.

  ECHO Getting Input Volume Stats
  ffmpeg -ss !SS! -i !FILE! -t !ET! -threads !THREADS! -vn -c:a libvorbis -af loudnorm=print_format=json -sn -f null NUL 2> !OFN!.volume
  FOR /F "tokens=1,3" %%i IN ( !OFN!.volume ) DO (
    SET X=%%j
    SET X=     !X:~1,-2!
    IF %%i == "input_i"      ECHO.    Integrated Loudness: !X:~-6!
    IF %%i == "input_lra"    ECHO.    Loudness Range:      !X:~-6!
    IF %%i == "input_tp"     ECHO.    True Peak:           !X:~-6!
  )
  DEL !OFN!.volume

  ECHO.

  ECHO Getting Output Volume Stats
  ffmpeg -i !OFN!.webm -threads !THREADS! -vn -c:a libvorbis -af loudnorm=print_format=json -sn -f null NUL 2> !OFN!.volume
  FOR /F "tokens=1,3" %%i IN ( !OFN!.volume ) DO (
    SET X=%%j
    SET X=     !X:~1,-2!
    IF %%i == "input_i"      ECHO.    Integrated Loudness: !X:~-6!
    IF %%i == "input_lra"    ECHO.    Loudness Range:      !X:~-6!
    IF %%i == "input_tp"     ECHO.    True Peak:           !X:~-6!
  )
  DEL !OFN!.volume

  WAITFOR /S %COMPUTERNAME% /SI aniopVolumeDone >NUL
)


IF %COMMAND% == "encode" (
  TITLE !OFN! - Encode

  REM Calculate Loudness Normalization ############################################################
  ECHO Normalizing Audio  - !time!
  SET LOUDNORMSTR^=I=%LN_I%:LRA=%LN_LRA%:TP=%LN_TP%:dual_mono=true:linear=true
  ffmpeg -ss %SS% -i !FILE! -t %ET% -threads %THREADS% -vn -af loudnorm=!LOUDNORMSTR!:print_format=json -sn -f null NUL 2> !OFN!.loudnorm
  SET LOUDNORMSTR^=!LOUDNORMSTR!:measured_I=AAA:measured_LRA=BBB:measured_TP=CCC:measured_thresh=DDD:offset=EEE
  FOR /F "tokens=1,3" %%i IN ( !OFN!.loudnorm ) DO (
    SET X=%%j
    SET Y=     !X:~1,-1!
    IF %%i == "input_i" (
      CALL SET LOUDNORMSTR=%%LOUDNORMSTR:AAA=!X:~1,-2!%%
	    ECHO.    Input Integrated Loudness: !Y:~-7,6!
    )
    IF %%i == "input_lra" (
      CALL SET LOUDNORMSTR=%%LOUDNORMSTR:BBB=!X:~1,-2!%%
	    ECHO.    Input Loudness Range:      !Y:~-7,6!
    )
    IF %%i == "input_tp" (
      CALL SET LOUDNORMSTR=%%LOUDNORMSTR:CCC=!X:~1,-2!%%
      ECHO.    Input True Peak:           !Y:~-7,6!
    )
    IF %%i == "input_thresh" (
      CALL SET LOUDNORMSTR=%%LOUDNORMSTR:DDD=!X:~1,-2!%%
      ECHO.    Input Threshold:           !Y:~-7,6!
    )
    IF %%i == "target_offset" (
      CALL SET LOUDNORMSTR=%%LOUDNORMSTR:EEE=!X:~1,-1!%%
      ECHO.    Target Offset:             !Y:~-6!
    )
  )
  DEL !OFN!.loudnorm
  ECHO.

  REM Minimize Bitrate ############################################################################
  ECHO Minimizing Bitrate - !time!
  ffprobe -i !FILE! -read_intervals !SS!%%+!ET! 2> !OFN!.bitrate
  FOR /F "tokens=5,6" %%i IN ( !OFN!.bitrate ) DO (
    IF "%%i" == "bitrate:" SET VBITRATE=%%j
  )
  DEL !OFN!.bitrate
  ECHO.     Input Bitrate = !VBITRATE!k
  IF !VBITRATE! GTR !VAVGRATE! SET VBITRATE=!VAVGRATE!
  SET VBITRATE=!VBITRATE!k
  ECHO.    Output Bitrate = !VBITRATE!
  ECHO.

  REM Start Encoding ##############################################################################
  ECHO Pass 1             - !time!
  START "!OFN! - Encode - Pass 1" /W CMD /C ffmpeg -ss !SS! -i !FILE! -t !ET! -pass 1 -threads !THREADS! -c:v libvpx-vp9 -b:v !VBITRATE! -maxrate !VMAXRATE! -speed !SPEED! -g !G! -slices !SLICES! -vf "!YADIF!crop=iw-!CROPX!:ih-!CROPY!:!CROPXOFFSET!:!CROPYOFFSET!,scale=-1:min(720\,ih-!CROPY!)" -tile-columns 6 -frame-parallel 0 -auto-alt-ref 1 -lag-in-frames 25 -c:a libvorbis -af loudnorm=!LOUDNORMSTR!!AFILTER! -sn -f webm -y -passlogfile !OFN! NUL
  ECHO Pass 2             - !time!
  START "!OFN! - Encode - Pass 2" /W CMD /C ffmpeg -ss !SS! -i !FILE! -t !ET! -pass 2 -threads !THREADS! -c:v libvpx-vp9 -b:v !VBITRATE! -maxrate !VMAXRATE! -speed !SPEED! -g !G! -slices !SLICES! -vf "!YADIF!crop=iw-!CROPX!:ih-!CROPY!:!CROPXOFFSET!:!CROPYOFFSET!,scale=-1:min(720\,ih-!CROPY!)" -tile-columns 6 -frame-parallel 0 -auto-alt-ref 1 -lag-in-frames 25 -c:a libvorbis -af loudnorm=!LOUDNORMSTR!!AFILTER! -sn -y -passlogfile !OFN! !OFN!.webm
  DEL !OFN!-0.log
  ECHO Done               - !time!
  WAITFOR /S %COMPUTERNAME% /SI aniopEncodeDone >NUL
)


IF %COMMAND% == "subtitles" (
  TITLE !OFN! - Subtitles
  ffmpeg -ss !SS! -dump_attachment:t "" -i !FILE! -t !ET! -y !OFN!.ass
  WAITFOR /S %COMPUTERNAME% /SI aniopSubtitlesDone >NUL
)

WAITFOR /S %COMPUTERNAME% /SI aniopDone >NUL
