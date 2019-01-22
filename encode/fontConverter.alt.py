#!/usr/bin/env python3
import sys
sys.path.insert(0,'/usr/local/lib/python3.6/site-packages')
import os, fontforge
from settings import debugFontConverter


# From https://stackoverflow.com/a/29834357/3878168
# All threading code removed and modified for Python 3.
class OutputGrabber(object):
	'''Class used to grab standard output or another stream.'''

	escape_char = b'\b'

	def __init__(self, stream):
		self.origstream = stream
		self.origstreamfd = self.origstream.fileno()
		self.capturedtext = ''
		self.pipe_out, self.pipe_in = None, None

	def __enter__(self):
		self.start()
		return self

	def __exit__(self, type, value, traceback):
		self.stop()

	def start(self):
		'''Start capturing the stream data.'''
		self.capturedtext = ''
		# Create a pipe so the stream can be captured.
		self.pipe_out, self.pipe_in = os.pipe()
		# Save a copy of the stream:
		self.streamfd = os.dup(self.origstreamfd)
		# Replace the original stream with our write pipe.
		os.dup2(self.pipe_in, self.origstreamfd)

	def stop(self):
		'''Stop capturing the stream data and save the text in `capturedtext`.'''
		# Print the escape character to make sure the loop in readOutput() stops.
		self.origstream.write(self.escape_char.decode())
		# Flush the stream to make sure all our data goes in before the escape character.
		self.origstream.flush()
		self.readOutput()
		# Close the pipes.
		os.close(self.pipe_out)
		os.close(self.pipe_in)
		self.pipe_out, self.pipe_in = None, None
		# Restore the original stream.
		os.dup2(self.streamfd,self.origstreamfd)

	def readOutput(self):
		'''Read the stream data and save the text in `capturedtext`.'''
		byte = os.read(self.pipe_out,1)
		data = b''
		while byte not in (b'',self.escape_char):
			data += byte
			byte = os.read(self.pipe_out,1)
		self.capturedtext = data.decode(self.origstream.encoding, errors='replace')


fromdir, todir = sys.argv[1:3]

errlog = []

files = os.listdir(fromdir)
tstr = '/' + str(len(files)) + ' => '
pad = len(str(len(files)))


# For each file in fromdir.
for index, file in enumerate(files,1):
	print(str(index).rjust(pad) + tstr + file, flush=True)

	if os.path.isfile(os.path.join(os.getcwd(), 'css', file + '.css')):
		continue

	# For each font in the file.
	for fname in fontforge.fontsInFile(os.path.join(fromdir,file)):
		print(' '*(pad*2+5) + fname, flush=True)

		# Get font info.
		stderr = OutputGrabber(sys.stderr)
		with stderr:
			try: font = fontforge.open(os.path.join(fromdir, file + '(' + fname + ')'), 1)
			except EnvironmentError as e:
				if str(e) == 'Open failed':
					try: font = fontforge.open(os.path.join(fromdir,file),1)
					except: raise
				else: raise
			newfilename = font.cidfontname or font.fontname
			font.generate(os.path.join(todir, newfilename + '.woff'))
			font.generate(os.path.join(todir, newfilename + '.woff2'))
			names = {font.cidfamilyname, font.cidfontname, font.cidfullname, font.familyname, font.fontname, font.fullname, font.default_base_filename, font.fondname}
			names.update(string for language, strid, string in font.sfnt_names if strid in {'Family', 'Fullname', 'PostScriptName'})
			font.close()
		if debugFontConverter:
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

		for i, error in enumerate(errors):
			if error[0] in {"Warning: Mac and Unicode entries in the 'name' table differ for the", "Warning: Mac and Windows entries in the 'name' table differ for the"}:
				if error[1].startswith(('Family', 'Fullname', 'PostScriptName')):
					# The Mac name seems to default to Arial, so we need to check for that or we'll get a lot of Arial fonts that aren't actually Arial.
					macName = error[2].split(':')[1].strip()
					if macName not in ('Arial','ArialMT'):
						names.add(macName)
					names.add(errors[i+1][0].split(':')[1].strip())

		# Add the font file name to the list of names for this font.
		names.add(os.path.splitext(os.path.basename(file))[0])
		names.discard(None)
		names.discard('')

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
		css = ''
		for name in names:
			css += '@font-face {\n'
			css += '\tfont-family: "' + name + '";\n'
			css += '\tsrc: url("../assets/fonts/' + newfilename + '.woff2"), url("../assets/fonts/' + newfilename + '.woff");\n'
			css += weightstyle
			css += '}\n'
		print(css, end='', file=open(os.path.join(os.getcwd(), 'css', file + '.css'), 'w'))


if debugFontConverter:
	print('ERRORS', '\n\n'.join(errlog), '', sep='\n')


fontFaces = set()
for fname in os.listdir('css'):
	with open(os.path.join('css', fname), 'r') as file:
		fontFaces.update(file.read().split('@font-face'))
print('@font-face'.join(sorted(fontFaces)), file=open('fonts.css','w'))
