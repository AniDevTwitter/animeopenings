#!/usr/bin/env python3


# removes comments
# combines adjacent override blocks
# adds timeOffset if given
# removes unused styles
# adds Blur style if used
# removes unused event columns
#   Layer - if they are all the same, otherwise may renumber them
#   Start - never
#   End - never
#   Style - never
#   Name - always
#   MarginL - if they are all 0
#   MarginR - if they are all 0
#   MarginV - if they are all 0
#   Effect - always
#   Text - never


import re, sys


class Style:
	def __init__(self, format, line):
		pieces = line.split(',', len(format) - 1)
		for i, piece in enumerate(pieces):
			setattr(self, format[i], piece.strip())

		# set defaults
		for attr in {'PrimaryColour', 'SecondaryColour', 'OutlineColour', 'BackColour'}:
			if not hasattr(self, attr):
				setattr(self, attr, '')
		for attr in {'Bold', 'Italic', 'Underline', 'StrikeOut', 'Spacing', 'Angle', 'Outline', 'Shadow', 'MarginL', 'MarginR', 'MarginV'}:
			if not hasattr(self, attr):
				setattr(self, attr, '0')
		if not hasattr(self, 'ScaleX'):
			self.ScaleX = '100'
		if not hasattr(self, 'ScaleY'):
			self.ScaleY = '100'
		if not hasattr(self, 'BorderStyle'):
			self.BorderStyle = '1'

		# normalize Bold, Italic, Underline, and StrikeOut
		if int(self.Bold):
			self.Bold = '1'
		if int(self.Italic):
			self.Italic = '1'
		if int(self.Underline):
			self.Underline = '1'
		if int(self.StrikeOut):
			self.StrikeOut = '1'

	def toStr(self, format):
		return 'Style:' + ','.join(getattr(self, x) for x in format)

KARAOKE_REGEX = re.compile(r'{\\(?:K|(?:k[fo]?))([0-9][^}]*?)(\\(?:K|(?:k[fo]?))[^}]*?})')
WHITESPACE_OVERRIDE_REGEX = re.compile(r'({[^}]*?)\s+([^}]*?})')
BLUR_OVERRIDE_REGEX = re.compile(r'({[^}]*?)\\blur([^}]*?})')
OVERRIDE_BLOCK_REGEX = re.compile(r'{[^}]*?}')
class Event:
	def __init__(self, format, line):
		# get attributes from line
		pieces = line.split(',', len(format) - 1)
		for i, piece in enumerate(pieces):
			setattr(self, format[i], piece.strip())

		# fix times
		if '-' in self.End:
			self.End = ''
			return
		if '-' in self.Start:
			self.Start = '0:00:00.00'

		# set defaults
		if not hasattr(self, 'Layer'):
			self.Layer = None
		if not hasattr(self, 'MarginL'):
			self.MarginL = '0'
		if not hasattr(self, 'MarginR'):
			self.MarginR = '0'
		if not hasattr(self, 'MarginV'):
			self.MarginV = '0'

		self.Blur = None

	def simplifyOverrides(self):
		text = self.Text


		# Remove whitespace at the start and end.
		text = text.strip()

		# Add an empty override block to the start.
		text = '{}' + text

		# Combine adjacent override blocks.
		text = text.replace('}{', '')

		# Remove whitespace inside override blocks.
		num = 1
		while num:
			text, num = WHITESPACE_OVERRIDE_REGEX.subn(r'\1\2', text)

		# Replace \blur with \be inside override blocks.
		num = 1
		while num:
			text, num = BLUR_OVERRIDE_REGEX.subn(r'\1\\be\2', text)

		# Fix multiple karaoke effects in one override.
		num = 1
		while num:
			text, num = KARAOKE_REGEX.subn(r'{\\kt\1\2', text)


		prev = ''
		first = True
		for block in OVERRIDE_BLOCK_REGEX.findall(text):
			curr = block[1:-1]

			if not curr:
				text = text.replace(block, '', 1)
				if first: first = False
				continue

			# split block
			overrides = curr.split('\\')

			if first:
				first = False
				for i, o in enumerate(overrides):
					if o.startswith('be') and not o.endswith((',',')')):
						self.Blur = float(o[2:] or 0)
						overrides[i] = ''

			curr = '\\' + '\\'.join(o for o in overrides if o)
			prev += curr
			text = text.replace(block, ('{' + curr + '}') if curr else '', 1)


		self.Text = text

	def toStr(self, format):
		self.Text = (('{\\be' + (str(self.Blur).rstrip('0').rstrip('.') or '0') + '}' if self.Blur != None else '') + self.Text).replace('}{','').replace('{}','')
		return 'Dialogue:' + ','.join(getattr(self, x) for x in format)


def getStyleFormat(events, styles):
	attr = ['Name', 'Fontname', 'Fontsize', 'PrimaryColour', 'SecondaryColour', 'OutlineColour', 'BackColour', 'Bold', 'Italic', 'Underline', 'StrikeOut', 'ScaleX', 'ScaleY', 'Spacing', 'Angle', 'BorderStyle', 'Outline', 'Shadow', 'Alignment', 'Justify', 'MarginL', 'MarginR', 'MarginV', 'Encoding', 'Blur']
	usedStyles = {}

	attr.remove('Encoding')

	# check events for used styles and use of Blur
	for event in events:
		if event.Style in usedStyles:
			if event.Blur in usedStyles[event.Style]:
				usedStyles[event.Style][event.Blur] += 1
			else:
				usedStyles[event.Style][event.Blur] = 1
		else:
			usedStyles[event.Style] = {event.Blur:1}

	# mark the styles that are used
	Bold = Italic = Underline = StrikeOut = ScaleX = ScaleY = Spacing = Angle = BorderStyle = Outline = Shadow = Justify = MarginL = MarginR = MarginV = Blur = False
	for style in styles:
		if style.Name in usedStyles:
			style.isUsed = True

			# Bold, Italic, Underline, StrikeOut, BorderStyle
			Bold = Bold or style.Bold == '1'
			Italic = Italic or style.Italic == '1'
			Underline = Underline or style.Underline == '1'
			StrikeOut = StrikeOut or style.StrikeOut == '1'
			BorderStyle = BorderStyle or style.BorderStyle != '1'

			# ScaleX, ScaleY
			ScaleX = ScaleX or float(style.ScaleX) != 100.0
			ScaleY = ScaleY or float(style.ScaleY) != 100.0

			# Spacing, Angle, Outline, Shadow
			Spacing = Spacing or bool(float(style.Spacing))
			Angle = Angle or bool(float(style.Angle))
			Outline = Outline or bool(float(style.Outline))
			Shadow = Shadow or bool(float(style.Shadow))

			# Justify
			if hasattr(style, 'Justify'):
				Justify = Justify or bool(int(style.Justify))

			# MarginL, MarginR, MarginV
			MarginL = MarginL or bool(float(style.MarginL))
			MarginR = MarginR or bool(float(style.MarginR))
			MarginV = MarginV or bool(float(style.MarginV))

			# Blur
			if hasattr(style, 'Blur'):
				Blur = True
			elif style.Name in usedStyles:
				blurs = usedStyles[style.Name]
				best = max(blurs,key=blurs.get)
				if best != None:
					style.Blur = str(best).rstrip('0').rstrip('.') or '0'
					for event in events:
						if event.Style == style.Name:
							if event.Blur == best:
								event.Blur = None
							elif event.Blur == None:
								event.Blur = 0
					Blur = True
				else:
					style.Blur = '0'
		else:
			style.isUsed = False

	if not Bold: attr.remove('Bold')
	if not Italic: attr.remove('Italic')
	if not Underline: attr.remove('Underline')
	if not StrikeOut: attr.remove('StrikeOut')
	if not ScaleX: attr.remove('ScaleX')
	if not ScaleY: attr.remove('ScaleY')
	if not Spacing: attr.remove('Spacing')
	if not Angle: attr.remove('Angle')
	if not BorderStyle: attr.remove('BorderStyle')
	if not Outline: attr.remove('Outline')
	if not Shadow: attr.remove('Shadow')
	if not Justify: attr.remove('Justify')
	if not MarginL: attr.remove('MarginL')
	if not MarginR: attr.remove('MarginR')
	if not MarginV: attr.remove('MarginV')
	if not Blur: attr.remove('Blur')

	return attr

def getEventFormat(events):
	layers = {}
	MarginL = MarginR = MarginV = False

	# check attributes
	layers = {int(event.Layer):0 for event in events if event.Layer != None}
	for event in events:
		MarginL = MarginL or bool(float(event.MarginL))
		MarginR = MarginR or bool(float(event.MarginR))
		MarginV = MarginV or bool(float(event.MarginV))

	# renumber layers
	if len(layers) > 1:
		for i, layer in enumerate(sorted(layers)):
			layers[layer] = i
		for event in events:
			if event.Layer != None:
				event.Layer = str(layers[int(event.Layer)])

	return [x for x in ['Layer' if len(layers) > 1 else '', 'Start', 'End', 'Style', 'MarginL' if MarginL else '', 'MarginR' if MarginR else '', 'MarginV' if MarginV else '', 'Text'] if x]


def convert(lines, offset=0):
	blockNames = {'info', 'styles', 'events', 'aegisub'}
	currentBlock = ''
	infoTypes = {'WrapStyle': None, 'PlayResX': None, 'PlayResY': None, 'ScaledBorderAndShadow': None, 'TimeOffset': offset}
	styleFormat = []
	styles = []
	eventFormat = []
	events = []

	for line in lines:
		# skip empty lines
		if not line: continue

		# skip comments
		if line.startswith((';','!:','//')): continue


		# line starts a new block
		if line.startswith('['):
			line = line.lower()
			for blockName in blockNames:
				if blockName in line:
					currentBlock = blockName
					break
			else:
				currentBlock = line
				print(currentBlock)
		else:
			# this shouldn't happen
			if not currentBlock: return []

			if currentBlock == 'info':
				type, value = line.split(':', 1)
				if type in infoTypes:
					if type == 'TimeOffset':
						infoTypes['TimeOffset'] = float(value)
					elif type == 'ScaledBorderAndShadow':
						value = value.strip().lower()
						try:
							if int(value) == 0:
								infoTypes['ScaledBorderAndShadow'] = 0
						except ValueError:
							if value == 'no':
								infoTypes['ScaledBorderAndShadow'] = 0
					else: infoTypes[type] = str(int(value))
			elif currentBlock == 'styles':
				if line.startswith('Format'):
					styleFormat = [piece.strip() for piece in line[8:].split(',')]
				elif line.startswith('Style'):
					styles.append(Style(styleFormat, line[6:]))
			elif currentBlock == 'events':
				if line.startswith('Format'):
					eventFormat = [piece.strip() for piece in line[7:].split(',')]
				elif line.startswith('Dialogue'):
					events.append(Event(eventFormat, line[9:]))
				elif line.startswith(('Comment','comment')):
					pass
				else:
					print(line)
			elif currentBlock == 'aegisub':
				pass
			else:
				print(line)


	# remove events that occur too early
	events = [event for event in events if event.End]

	# simplify event overrides
	for event in events:
		event.simplifyOverrides()


	out = []

	# add info block
	out.append('[Script Info]')
	if infoTypes['WrapStyle'] != None: out.append('WrapStyle:' + infoTypes['WrapStyle'])
	if infoTypes['PlayResX'] != None: out.append('PlayResX:' + infoTypes['PlayResX'])
	if infoTypes['PlayResY'] != None: out.append('PlayResY:' + infoTypes['PlayResY'])
	if infoTypes['ScaledBorderAndShadow'] == 0: out.append('ScaledBorderAndShadow:0')
	if infoTypes['TimeOffset']: out.append('TimeOffset:' + str(infoTypes['TimeOffset']))

	# add style block
	out.append('[V4+ Styles]')
	styleFormat = getStyleFormat(events, styles)
	out.append('Format:' + ','.join(styleFormat))
	out.extend(style.toStr(styleFormat) for style in styles if style.isUsed)

	# add events block
	out.append('[Events]')
	eventFormat = getEventFormat(events)
	out.append('Format:' + ','.join(eventFormat))
	out.extend(event.toStr(eventFormat) for event in events)

	return out

if __name__ == '__main__':
	if len(sys.argv) > 1:
		for line in convert([line.strip() for line in open(sys.argv[1], encoding='utf8') if line], int(sys.argv[2]) if len(sys.argv) > 2 else 0):
			print(line)
