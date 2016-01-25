**I've tried to keep this kinda short, but also explaining the reason for all the decisions in a concise manner**

# Intro

Large projects have a lot of contributors. And contributors have different habits, sometime we have to fix some of those habits so that people can all write similar code.

**NOTE: This guide is new, some things do not adhere to this yet, but please try to stick to this file when adding new things or doing code cleanup**

If you don't want to read the entire sections, **read the text in bold for the most important part**

## Indentation

### Regular indentation

If supported by the language, **use 2-space indents**. Languages which do not support this are rare.

If 2-space indents are not supported by the language, use 4-space indents. 

2-space indents are plenty for readability, while 4-space indents just waste horizontal space for people with monitors in a vertial position. As writing code with vertical monitors have become pretty common lately, let's show them some love.

### Continuation indents

**Do not use continuation indents**, if you don't write your code on a single line, **create a block instead.**

Wrong:

```python
if debug:
  something.run(variable1=True,
    variable2=False,
    variable3="Potato")
```

Correct:

```python
if debug:
  something.run(
    variable1=True,
    variable2=False,
    variable3="Potato")
```

Also correct, but only recommended for shorter lines:

```python
if debug:
  something.run(var1=True, var2=False)
```

This is for consistency, nothing else

## Code

### Brackets

**Open brackets on the same line as the statement**, there's no point in wasting a line for the `{` (And no, "Readability" is not an argument it's called personal preference)

Wrong:

```php
if ($something == True)
{
  echo "Yes";
}
```

Correct:

```php
if ($something == True){
  echo "Yes";
}
```

The spacing between the `if/else`, the `(statement)` and the opening bracket is up to you, we're not that picky. A single space does not create much of a difference in readability.

### Line breaks

**Do not break lines, unless you feel it's a viable option to use a proper block instead**, if people want to read long lines, they should be capable of enabling soft-wrap in their editor. You should never break a line just because "It's getting too long"

Wrong: 

```python
do.something(var1=True, var2=False,
  var3="Hey", var="Potato", var4="Placeholder")
```

Correct: 

```python
do.something(var1=True, var2=False, var3="Hey", var="Potato", var4="Placeholder")
```

Also correct: 

```python
do.something(
  var1=True,
  var2=False, 
  var3="Hey", 
  var="Potato", 
  var4="Placeholder")
```
