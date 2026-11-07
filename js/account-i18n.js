/*
  account-i18n.js: Arabic text for the interface strings that JavaScript writes into /ar/account/ and /ar/account/reset/.
  The scripts keep their English source strings and pass them through AtherbyteI18n.t(); on English pages this file is
  not loaded (t is then the identity). Exact strings are matched in DICT, strings with a name or address in them in PATTERNS.
  tools/build.mjs checks nothing here at build time; tests/site.test.mjs checks every English message has an Arabic one.
*/
(function (root) {
  "use strict";
  var isAr = !!(root.document && root.document.documentElement && root.document.documentElement.lang === "ar");
  var LRI = "⁦", PDI = "⁩";   // keep user names and addresses readable inside Arabic sentences
  function iso(s) { return LRI + s + PDI; }

  var DICT = {
    /* shared client messages (js/atherbyte-account.js) */
    "Use 3 to 20 letters, numbers or underscores (no spaces).": "استخدم من 3 إلى 20 حرفًا أو رقمًا أو شرطة سفلية (بدون مسافات).",
    "That name is reserved. Please choose another.": "هذا الاسم محجوز. يرجى اختيار اسم آخر.",
    "Use a password of 8 to 72 characters that is different from your username.": "استخدم كلمة مرور من 8 إلى 72 حرفًا تختلف عن اسم المستخدم.",
    "That username is already taken. Please choose another.": "اسم المستخدم هذا مستخدم بالفعل. يرجى اختيار اسم آخر.",
    "That password is too easy to guess. Please choose a longer, less common one.": "كلمة المرور هذه سهلة التخمين. اختر كلمة أطول وأقل شيوعًا.",
    "Please choose a password different from your current one.": "يرجى اختيار كلمة مرور تختلف عن الحالية.",
    "That email address doesn't look right. Please check it and try again.": "يبدو أن عنوان البريد الإلكتروني غير صحيح. تحقق منه وحاول مجددًا.",
    "Enter your username or your recovery email.": "أدخل اسم المستخدم أو بريد الاسترداد.",
    "This reset link is not valid. It may have expired or already been used.": "رابط إعادة التعيين غير صالح. ربما انتهت صلاحيته أو استُخدم من قبل.",
    "Wrong username or password.": "اسم المستخدم أو كلمة المرور غير صحيحة.",
    "Too many attempts. Please wait a minute and try again.": "محاولات كثيرة. انتظر دقيقة ثم حاول مجددًا.",
    "The account service is not ready yet. Please try again later.": "خدمة الحسابات غير جاهزة بعد. يرجى المحاولة لاحقًا.",
    "The security check failed. Please try it again.": "فشل الفحص الأمني. يرجى المحاولة مجددًا.",
    "Please complete the security check first.": "يرجى إكمال الفحص الأمني أولًا.",
    "The security check is not set up yet, so accounts are not open yet.": "الفحص الأمني غير مُعدّ بعد، لذا لم يُفتح التسجيل بعد.",
    "The security check could not be reached. Please try again.": "تعذّر الوصول إلى الفحص الأمني. يرجى المحاولة مجددًا.",
    "The account service is not set up yet. Please try again later.": "خدمة الحسابات غير مُعدّة بعد. يرجى المحاولة لاحقًا.",
    "Accounts are not available on this site yet.": "الحسابات غير متاحة في هذا الموقع بعد.",
    "This page is not allowed to use the account service.": "غير مسموح لهذه الصفحة باستخدام خدمة الحسابات.",
    "Your session has ended. Please sign in again.": "انتهت جلستك. يرجى تسجيل الدخول مجددًا.",
    "The account service is having trouble. Please try again later.": "تواجه خدمة الحسابات مشكلة. يرجى المحاولة لاحقًا.",
    "Something went wrong on our side. Please try again later.": "حدث خطأ من جانبنا. يرجى المحاولة لاحقًا.",
    "Something went wrong. Please reload the page and try again.": "حدث خطأ ما. أعد تحميل الصفحة وحاول مجددًا.",
    "That input is too long.": "المُدخل طويل جدًا.",
    "Your profile could not be found. Please sign in again.": "تعذّر العثور على ملفك الشخصي. يرجى تسجيل الدخول مجددًا.",
    "Profile pictures unlock after you verify a recovery email.": "تُتاح صور الملف الشخصي بعد توثيق بريد الاسترداد.",
    "That picture is too big. Please choose a smaller one.": "الصورة كبيرة جدًا. اختر صورة أصغر.",
    "That file is not a picture we can use. Please choose a PNG, JPEG or WebP image.": "هذا الملف ليس صورة يمكننا استخدامها. اختر صورة PNG أو JPEG أو WebP.",
    "That picture is too small or too large. Please choose another one.": "الصورة صغيرة جدًا أو كبيرة جدًا. اختر صورة أخرى.",
    "Your browser could not read that picture. Please choose a PNG, JPEG or WebP image.": "تعذّر على متصفحك قراءة الصورة. اختر صورة PNG أو JPEG أو WebP.",
    "The account service took too long to answer. Please try again.": "استغرقت خدمة الحسابات وقتًا طويلًا للرد. يرجى المحاولة مجددًا.",
    "Could not reach the account service. Check your connection and try again.": "تعذّر الوصول إلى خدمة الحسابات. تحقق من اتصالك وحاول مجددًا.",
    "The account service sent something unexpected. Please try again.": "أرسلت خدمة الحسابات ردًا غير متوقع. يرجى المحاولة مجددًا.",
    "Something went wrong. Please try again.": "حدث خطأ ما. يرجى المحاولة مجددًا.",

    /* account page */
    "Hide": "إخفاء", "Show": "إظهار",
    "Sending…": "جارٍ الإرسال…", "Signing in…": "جارٍ تسجيل الدخول…", "Creating your account…": "جارٍ إنشاء حسابك…",
    "Saving…": "جارٍ الحفظ…", "Removing…": "جارٍ الإزالة…", "Signing out…": "جارٍ تسجيل الخروج…",
    "If that account has a verified recovery email, a reset link is on its way. It can take a few minutes, so check your spam folder too. The link works once and only for a short time.":
      "إن كان للحساب بريد استرداد موثّق فرابط إعادة التعيين في طريقه إليه. قد يستغرق بضع دقائق، فتحقق من مجلد الرسائل غير المرغوبة أيضًا. يعمل الرابط مرة واحدة ولمدة قصيرة فقط.",
    "Please tick the box to confirm you understand the recovery warning.": "يرجى تحديد المربع لتأكيد فهمك لتحذير الاسترداد.",
    "Account created. Please sign in with your new username and password.": "تم إنشاء الحساب. يرجى تسجيل الدخول باسم المستخدم وكلمة المرور الجديدين.",
    "Verified": "موثّق", "Waiting for confirmation": "بانتظار التأكيد", "Not verified": "غير موثّق",
    "Send the link again": "أرسل الرابط مجددًا", "Send verification link": "أرسل رابط التحقق",
    "Your recovery email is now verified.": "تم توثيق بريد الاسترداد الآن.",
    "Confirmation link sent. Open it from your email to finish.": "تم إرسال رابط التأكيد. افتحه من بريدك لإكمال العملية.",
    "Preview only. Press Save picture to use it.": "معاينة فقط. اضغط «حفظ الصورة» لاستخدامها.",
    "Picture saved. It now shows everywhere you are signed in.": "تم حفظ الصورة. ستظهر الآن في كل مكان تسجّل فيه الدخول.",
    "Picture removed.": "تمت إزالة الصورة.",
    "Recovery email verified": "بريد الاسترداد موثّق",
    "Recovery email waiting for confirmation": "بريد الاسترداد بانتظار التأكيد",
    "No verified recovery email": "لا يوجد بريد استرداد موثّق",
    "You are signed out.": "تم تسجيل خروجك.",
    "That email link has expired or was already used. Send a new one from your account page.": "انتهت صلاحية رابط البريد أو استُخدم من قبل. أرسل رابطًا جديدًا من صفحة حسابك.",
    "That email link did not work. Please send a new one from your account page.": "لم يعمل رابط البريد. يرجى إرسال رابط جديد من صفحة حسابك.",
    "Your link was accepted, but the email change is not finished: the service is still waiting for a second confirmation that cannot be completed from this account. This is a setting on our side, not a mistake of yours. Your status below is accurate.":
      "تم قبول رابطك، لكن تغيير البريد لم يكتمل: ما زالت الخدمة تنتظر تأكيدًا ثانيًا لا يمكن إتمامه من هذا الحساب. هذا إعداد من جانبنا وليس خطأ منك. الحالة الموضحة أدناه دقيقة.",
    "Thanks for opening the link. Your recovery email status is shown below.": "شكرًا لفتحك الرابط. تظهر حالة بريد الاسترداد أدناه.",
    "Thanks for opening the link. Sign in to see your recovery email status.": "شكرًا لفتحك الرابط. سجّل الدخول لترى حالة بريد الاسترداد.",
    " The account service has not been connected yet.": " لم تُربط خدمة الحسابات بعد.",
    "Your browser is blocking site storage, so you will be signed out when you close this page and games won't see your sign-in.": "يمنع متصفحك تخزين بيانات الموقع، لذا سيتم تسجيل خروجك عند إغلاق الصفحة ولن ترى الألعاب تسجيل دخولك.",
    " Showing the details saved on this device.": " نعرض التفاصيل المحفوظة على هذا الجهاز.",

    /* reset page */
    "The two passwords are not the same.": "كلمتا المرور غير متطابقتين."
  };

  var PATTERNS = [
    [/^Signed in\. Welcome back, (.+)\.$/, function (m) { return "تم تسجيل الدخول. مرحبًا بعودتك، " + iso(m[1]) + "."; }],
    [/^Account created\. You are signed in as (.+)\. Remember: without a verified recovery email, a lost password cannot be recovered\.$/,
      function (m) { return "تم إنشاء الحساب. أنت مسجّل الدخول باسم " + iso(m[1]) + ". تذكّر: دون بريد استرداد موثّق لا يمكن استرداد كلمة مرور مفقودة."; }],
    [/^We sent a confirmation link( to (.+))?\. Open it to finish\. If it has not arrived after a few minutes, check your spam folder or send it again\.$/,
      function (m) { return "أرسلنا رابط تأكيد" + (m[2] ? " إلى " + iso(m[2]) : "") + ". افتحه لإكمال العملية. إن لم يصل بعد بضع دقائق فتحقق من مجلد الرسائل غير المرغوبة أو أعد إرساله."; }],
    [/^Still waiting for the confirmation\. Open the link in the email we sent( to (.+))?\.$/,
      function (m) { return "ما زلنا بانتظار التأكيد. افتح الرابط في الرسالة التي أرسلناها" + (m[2] ? " إلى " + iso(m[2]) : "") + "."; }],
    [/^Choose a new password for (.+)\.$/, function (m) { return "اختر كلمة مرور جديدة للحساب " + iso(m[1]) + "."; }]
  ];

  function t(s) {
    if (!isAr || typeof s !== "string") { return s; }
    if (Object.prototype.hasOwnProperty.call(DICT, s)) { return DICT[s]; }
    for (var i = 0; i < PATTERNS.length; i++) { var m = PATTERNS[i][0].exec(s); if (m) { return PATTERNS[i][1](m); } }
    return s;
  }

  var api = { isAr: isAr, t: t, DICT: DICT, PATTERNS: PATTERNS };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; } else { root.AtherbyteI18n = api; }
})(typeof self !== "undefined" ? self : this);
