---
title: הרצה וניפוי באגים (launch.json)
category: כלי סביבת העבודה
order: 91
summary: הריצו את תצורות ההפעלה של VS Code בלי לצאת מ־Gitcito.
keywords: הפעלה הרצה ניפוי באגים תצורות משימות רקע launch.json run debug vscode configs tasks preLaunchTask input background
---

# הרצה וניפוי באגים

Gitcito קורא את `.vscode/launch.json` שלכם — זה שבשורש וכל אלה שמקוננים בתוכו,
מקובצים עם מפרידים — ומריץ את התצורה שתבחרו בטרמינל המשולב.

![בורר ההפעלה וסרגל הכלים הצף](../../screenshots/launch-configs.webp)

- **משתני** VS Code **נפתרים** (`${workspaceFolder}` וחבריו).
- ה־**`preLaunchTask`** של תצורה רץ ראשון.
- ערכי **`${input:…}`** נשאלים באופן אינטראקטיבי לפני ההפעלה (`promptString`
  ו־`pickString`).
- משימות **`isBackground`** (צופים, שרתי פיתוח) רצות מנותקות, ולכן הן לעולם אינן
  חוסמות את ההפעלה.

סרגל כלים צף נותן לכם **השהיה / המשך, הפעלה מחדש, עצירה**, ומחליף בין סשנים
רצים.

הפעילו את זה ב**הגדרות ← כללי ← הפעלת launch.json**. כפתור **הפעלה** מופיע לצד
הלשוניות Git / קבצים.

**ראו גם:** [טרמינל משולב](terminal.md)
