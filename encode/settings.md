### 4th April 2015, v1

    ffmpeg -i "input.something" -c:v libvpx -qmin 17 -b:v 3M -qmax 45 -slices 4 -vf scale=-1:720 -preset veryslow -threads 4 -lag-in-frames 25 -c:a libvorbis -b:a 96k -sn "output.webm"

### 11th April 2015, v2

    ffmpeg -i "input.something" -c:v libvpx-vp9 -qmin 13 -b:v 3M -qmax 45 -slices 4 -vf scale=-1:720 -preset placebo -threads 4 -lag-in-frames 25 -c:a libvorbis -b:a 96k -sn "output.webm"

### 10th May 2015, v3

    ffmpeg -i "input.something" -c:v libvpx-vp9 -qmin 10 -b:v 3M -qmax 32 -slices 4 -vf scale=-1:720 -preset placebo -threads 4 -lag-in-frames 25 -c:a libvorbis -b:a 128k -sn "output.webm"

### 16th May 2015, v4
We are using two-pass encoding now for better encodes with less tweaking around. -g helps for seeking in video by adding keyframes. For finetuning change b:v and maxrate. Make sure to change /dev/null to NUL if you are using windows.

    ffmpeg -i "input.something" -pass 1 -c:v libvpx-vp9 -b:v 3200k -maxrate 3700k -speed 4 -g 250 -slices 4 -vf 'scale=-1:720' -preset placebo -threads 4 -lag-in-frames 25 -an -f webm -y -sn /dev/null
    ffmpeg -i "input.something" -pass 2 -c:v libvpx-vp9 -b:v 3200k -maxrate 3700k -bufsize 6000k -speed 1 -g 250 -slices 4 -vf 'scale=-1:720' -preset placebo -threads 4 -lag-in-frames 25 -c:a libvorbis -b:a 128k -y -sn "output.webm"

### 16th May 2015, v4.1
Most of the current VP9 decoders use tile-based, multi-threaded decoding. In order for the decoders to take advantage of multiple cores, the encoder must set tile-columns and frame-parallel. Setting auto-alt-ref and lag-in-frames >= 12 will turn on VP9's alt-ref frames, a VP9 feature that enhances quality.

    ffmpeg -i "input.something" -pass 1 -c:v libvpx-vp9 -b:v 3200k -maxrate 3700k -speed 4 -g 250 -slices 4 -vf 'scale=-1:720' -threads 4 -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -lag-in-frames 25 -an -f webm -y -sn /dev/null
    ffmpeg -i "input.something" -pass 2 -c:v libvpx-vp9 -b:v 3200k -maxrate 3700k -bufsize 6000k -speed 1 -g 250 -slices 4 -vf 'scale=-1:720' -threads 4 -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -lag-in-frames 25 -c:a libvorbis -b:a 128k -y -sn "output.webm"

### 1st November 2015, v4.2
Audio quality has increased to 192k. Audio levels will now be normalized. To make the process easier you can use the [encode.py](https://github.com/AniDevTwitter/animeopenings/blob/master/encode/encode.py) script. You will need Python 3 and ffmpeg in your path for it to function. Depending on your source material consider using noise reduction via '-n light' or '-n heavy'. If you don't want to use the script, here is the manual way:

    ffmpeg -i "input.something" -af "volumedetect" -f null /dev/null

Remember the number * (-1) in the output line that looks something like this "[Parsed_volumedetect_0 @ 000000dc26e72ae0] max_volume: -9.0 dB". We will refer to it as $VOL.

    ffmpeg -i "input.something" -pass 1 -c:v libvpx-vp9 -b:v 3200k -maxrate 3700k -speed 4 -g 250 -slices 4 -vf 'scale=-1:720' -threads 4 -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -lag-in-frames 25 -an -f webm -y -sn /dev/null
    ffmpeg -i "input.something" -pass 2 -c:v libvpx-vp9 -b:v 3200k -maxrate 3700k -bufsize 6000k -speed 1 -g 250 -slices 4 -vf 'scale=-1:720' -af 'volume=$VOLdB:precision=double' -threads 4 -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 -lag-in-frames 25 -c:a libvorbis -b:a 192k -y -sn "output.webm"

### 12th January 2017, v5
Better audio normalization uzing the `loudnorm` audio filter.

    ffmpeg -ss START_TIME -i INPUT_FILE -to END_TIME -pass 1 -threads 4 -c:v libvpx-vp9 -b:v 3200k -maxrate 3700k -speed 4 -g 240 -slices 4 -vf "scale=-1:min(720\,ih)" -tile-columns 6 -frame-parallel 0 -auto-alt-ref 1 -lag-in-frames 25 -c:a libvorbis -af loudnorm=I=-16:LRA=20:TP=-1:dual_mono=true:linear=true:print_format=json -sn -f webm -y /dev/null

This will output a JSON object something like:

    {
        "input_i" : "-27.61",		// AAA
        "input_tp" : "-4.47",		// CCC
        "input_lra" : "18.06",		// BBB
        "input_thresh" : "-39.20",	// DDD
        "output_i" : "-16.58",
        "output_tp" : "-1.50",
        "output_lra" : "14.78",
        "output_thresh" : "-27.71",
        "normalization_type" : "dynamic",
        "target_offset" : "0.58"	// EEE
    }

The five marked values are then used in the second pass.

    ffmpeg -ss START_TIME -i INPUT_FILE -to END_TIME -pass 2 -threads 4 -c:v libvpx-vp9 -b:v 3200k -maxrate 3700k -speed 1 -g 240 -slices 4 -vf "scale=-1:min(720\,ih)" -tile-columns 6 -frame-parallel 0 -auto-alt-ref 1 -lag-in-frames 25 -c:a libvorbis -af loudnorm=I=-16:LRA=20:TP=-1:dual_mono=true:linear=true:measured_I=AAA:measured_LRA=BBB:measured_TP=CCC:measured_thresh=DDD:offset=EEE -sn -y OUTPUT_FILE
