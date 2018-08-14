# this script is only to be called from fontforge
# fontforge -script fontConverter.py fonts woff
import os, sys, fontforge


# From https://stackoverflow.com/a/29834357/3878168
# All threading code removed.
class OutputGrabber(object):
	'''Class used to grab standard output or another stream.'''

	escape_char = '\b'

	def __init__(self, stream):
		self.origstream = stream
		self.origstreamfd = self.origstream.fileno()
		self.capturedtext = ''
		# Create a pipe so the stream can be captured.
		self.pipe_out, self.pipe_in = os.pipe()

	def __enter__(self):
		self.start()
		return self

	def __exit__(self, type, value, traceback):
		self.stop()

	def start(self):
		'''Start capturing the stream data.'''
		self.capturedtext = ''
		# Save a copy of the stream:
		self.streamfd = os.dup(self.origstreamfd)
		# Replace the original stream with our write pipe.
		os.dup2(self.pipe_in, self.origstreamfd)

	def stop(self):
		'''Stop capturing the stream data and save the text in `capturedtext`.'''
		# Print the escape character to make sure the loop in readOutput() stops.
		self.origstream.write(self.escape_char)
		# Flush the stream to make sure all our data goes in before the escape character.
		self.origstream.flush()
		self.readOutput()
		# Close the pipe.
		os.close(self.pipe_out)
		# Restore the original stream.
		os.dup2(self.streamfd, self.origstreamfd)

	def readOutput(self):
		'''Read the stream data and save the text in `capturedtext`.'''
		try:
			while True:
				data = os.read(self.pipe_out, 1)
				if not data or self.escape_char in data:
					self.capturedtext += data.split(self.escape_char)[0]
					break
				self.capturedtext += data
		except OSError:
			pass


fromdir, todir = sys.argv[1:3]
css = ''

errlog = []
useErrorLog = False

files = os.listdir(fromdir)
tstr = '/' + str(len(files)) + ' => '
pad = len(str(len(files)))


# For each file in fromdir.
for index, file in enumerate(files,1):
	print(str(index).rjust(pad) + tstr + file)

	if os.path.isfile(os.path.join(os.getcwd(), 'css', file + '.css')):
		continue

	# For each font in the file.
	for fname in fontforge.fontsInFile(os.path.join(fromdir,file)):
		print(' '*(pad*2+5) + fname)

		# Get font info.
		stderr = OutputGrabber(sys.stderr)
		with stderr:
			try: font = fontforge.open(bytearray(os.path.join(fromdir, file + '(' + fname + ')')).decode('utf8'), 1)
			except EnvironmentError as e:
				if str(e) == 'Open failed':
					try: font = fontforge.open(bytearray(os.path.join(fromdir, file)).decode('utf8'), 1)
					except: raise
				else: raise
			newfilename = font.cidfontname or font.fontname
			font.generate(os.path.join(todir, newfilename + '.woff'))
			names = {font.cidfamilyname, font.cidfontname, font.cidfullname, font.familyname, font.fontname, font.fullname, font.default_base_filename, font.fondname}
			names.update(string for language, strid, string in font.sfnt_names if strid in {'Family', 'Fullname', 'PostScriptName'})
			font.close()
		if useErrorLog:
			errlog.append(stderr.capturedtext.strip())

		# Get more font info from the stderr error messages.
		error, errors = [], []
		for line in stderr.capturedtext.strip().split('\n'):
			if line.startswith(' '):
				error.append(line.strip())
			else:
				if error: errors.append(error)
				error = [line.strip()]
		if error: errors.append(error)

		for error in errors:
			if error[0] in {"Warning: Mac and Unicode entries in the 'name' table differ for the", "Warning: Mac and Windows entries in the 'name' table differ for the"}:
				if error[1].startswith(('Family', 'Fullname', 'PostScriptName')):
					if 'Unicode' in error[0]: print(error)
					# The Mac name seems to default to Arial, so we need to check for that or we'll get a lot of Arial fonts that aren't actually Arial.
					macName = error[2].split(':')[1].strip()
					if macName not in ('Arial','ArialMT'):
						names.add(macName)
					names.add(error[3].split(':')[1].strip())

		# Add the font file name to the list of names for this font
		names.add(os.path.splitext(os.path.basename(file))[0])
		names.discard(None)

		# Find font weight and style.
		weight = ''
		italic = False
		oblique = False
		for name in names:
			nlower = name.lower()

			if 'thin' in nlower or 'hairline' in nlower:
				weight = '100'
			elif 'extralight' in nlower or 'ultralight' in nlower:
				weight = '200'
			elif 'light' in nlower:
				weight = '300'
			elif 'normal' in nlower:
				weight = '400'
			elif 'medium' in nlower:
				weight = '500'
			elif 'semibold' in nlower or 'demibold' in nlower or 'demi' in nlower:
				weight = '600'
			elif 'extrabold' in nlower or 'ultrabold' in nlower:
				weight = '800'
			elif 'bold' in nlower:
				weight = '700'
			elif 'black' in nlower or 'heavy' in nlower:
				weight = '900'

			if 'italic' in nlower: italic = True
			elif 'oblique' in nlower: oblique = True

		weightstyle = ''
		if weight:
			weightstyle += '\tfont-weight: ' + weight + ';\n'
		if italic:
			weightstyle += '\tfont-style: italic;\n'
		elif oblique:
			weightstyle += '\tfont-style: oblique;\n'

		# Append @font-face for this font.
		filecss = ''
		for name in names:
			filecss += '@font-face {\n'
			filecss += '\tfont-family: "' + name + '";\n'
			filecss += '\tsrc: url("../assets/fonts/' + newfilename + '.woff");\n'
			filecss += weightstyle
			filecss += '}\n'
		with open(os.path.join(os.getcwd(), 'css', file + '.css'), 'wb') as fontFile:
			fontFile.write(filecss)
		css += filecss


if useErrorLog:
	print('ERRORS')
	for error in errlog:
		print(error)
		print('')


fontFaces = set()
with open('fonts.css', 'wb') as fontFile:
	for fname in os.listdir('css'):
		with open(os.path.join('css', fname), 'rb') as file:
			fontFaces.update(file.read().split('@font-face'))
	fontFile.write('@font-face'.join(sorted(fontFaces)))
