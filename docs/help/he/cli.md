---
title: שורת הפקודה
category: כלי סביבת העבודה
order: 93
summary: `gitcito .` — כמו `code .`, אבל ל־Git.
keywords: שורת פקודה טרמינל נתיב התקנה פתיחת תיקייה מופע יחיד cli command line terminal shim path install open folder single instance
---

# שורת הפקודה

```sh
gitcito .                        # open this folder
gitcito ~/code/api               # …or that one
gitcito . -n "My API"            # with a display name
gitcito . -g "Work"              # inside a group tab
gitcito . -n "My API" -g "Work"  # both
```

## התקנת ה־shim

פלטת הפקודות (<kbd>⌘K</kbd>) ← **התקנת הפקודה 'gitcito' ב־PATH** (macOS). היא
יוצרת קישור סימבולי ל־shim קטן ב־`/usr/local/bin` או ב־`/opt/homebrew/bin`,
ומבקשת הרשאות מנהל רק אם אף אחד מהם אינו ניתן לכתיבה על ידכם. הריצו את אותה פקודה
שוב כדי להסיר.

## איך זה מתנהג

- אם הנתיב **כבר פתוח** — כלשונית או בתוך קבוצה — Gitcito **ממקד אותו** במקום
  לפתוח כפילות.
- אם הוא עדיין אינו מאגר Git, הוא עדיין נפתח, ומציע את זרימת ״אתחול מאגר כאן״.
- `-g` מוסיף את המאגר לקבוצה בשם הזה, ויוצר את הקבוצה אם היא לא קיימת.
- Gitcito הוא **מופע יחיד**: הרצת `gitcito` בזמן שהאפליקציה פתוחה מוסרת את הבקשה
  לחלון הזה במקום להפעיל עותק שני.

**ראו גם:** [סביבות עבודה, לשוניות וקבוצות](workspaces.md)
