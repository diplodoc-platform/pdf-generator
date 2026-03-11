# Code

On the website, a wide code block has a horizontal scroll, and in PDF mode, the text will wrap.

## Wide table in code block

```md
| Title1 | Title2 | Title3 | Title4 | Title5 | Title6 | Title7 | Title8 | Title9 | Title10 |
| ---------- | ---------- | ---------- | ---------- | ---------- | ---------- | ---------- | ---------- | ---------- | ---------- |
| Text | Text | Text | Text | Text | Text | Text | Text | Text | Text |
| Text | Text | Text | Text | Text | Text | Text | Text | Text | Text |
| Text | Text | Text | Text | Text | Text | Text | Text | Text | Text |
```

## Long single-line string in code block

The following code block contains a line that exceeds the page width. It must wrap instead of being clipped.

```ini
[proprietary]
name=Base
baseurl=http://base.url.base/large-path/large-path/large-path/large-path/large-path/large-path/large-path/large-path/large-path/large-path/large-path/large-path/large-path/large-path/
gpgcheck=0
enabled=1
priority=2
```

## Long URL in paragraph

This paragraph contains a long URL without spaces that must wrap and not be clipped: http://base.url.base/large-path/large-path/large-path/large-path/large-path/large-path/large-path/large-path/large-path/large-path/large-path/large-path/large-path/large-path/