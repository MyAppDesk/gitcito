---
title: سطر الأوامر
category: أدوات مساحة العمل
order: 93
summary: `gitcito .` — مثل `code .`، لكن لـ Git.
keywords: سطر الأوامر طرفية وسيط مسار تثبيت فتح مجلد نسخة واحدة cli command line terminal shim path install open folder single instance
---

# سطر الأوامر

```sh
gitcito .                        # open this folder
gitcito ~/code/api               # …or that one
gitcito . -n "My API"            # with a display name
gitcito . -g "Work"              # inside a group tab
gitcito . -n "My API" -g "Work"  # both
```

## تثبيت الوسيط

لوحة الأوامر (<kbd>⌘K</kbd>) ← **ثبّت أمر 'gitcito' في PATH** (على macOS).
ينشئ ذلك رابطًا رمزيًا لوسيط صغير داخل `/usr/local/bin` أو
`/opt/homebrew/bin`، ولا يطلب صلاحيات المدير إلا إذا لم يكن أيٌّ منهما قابلًا
للكتابة من قِبلك. شغّل الأمر نفسه مرة أخرى لإلغاء التثبيت.

## كيف يتصرّف

- إن كان المسار **مفتوحًا بالفعل** — كتبويب أو داخل مجموعة — فإن Gitcito
  **يركّز عليه** بدل أن يفتح نسخة مكرّرة.
- وإن لم يكن مستودع Git بعد، فإنه يُفتح رغم ذلك، عارضًا مسار "تهيئة مستودع
  هنا".
- يضيف `-g` المستودع إلى مجموعة بذلك الاسم، وينشئ المجموعة إن لم تكن موجودة.
- Gitcito **أحادي النسخة**: تشغيل `gitcito` والتطبيق مفتوح يسلّم الطلب إلى تلك
  النافذة بدل إطلاق نسخة ثانية.

**انظر أيضًا:** [مساحات العمل والتبويبات والمجموعات](workspaces.md)
