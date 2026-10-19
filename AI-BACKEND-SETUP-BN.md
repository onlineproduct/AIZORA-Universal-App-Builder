# AIZORA Universal App Builder — AI Backend Setup (বাংলা)

এই Worker-টি অ্যাপের Code AI-কে OpenAI-compatible chat-completions API-র সঙ্গে যুক্ত করে। API key কখনো APK, HTML বা GitHub source code-এ রাখবেন না।

## ১. Cloudflare-এ Worker তৈরি করুন
1. Cloudflare Dashboard → Workers & Pages → Create → Worker.
2. Worker-এর নাম দিন `aizora-universal-app-builder-ai`.
3. Worker-এর code-এ `ai-worker/src/index.js` ফাইলের সম্পূর্ণ কোড পেস্ট করুন, অথবা Wrangler ব্যবহার করে এই ফোল্ডার deploy করুন।
4. Worker Settings → Variables and Secrets-এ `AI_API_KEY` নামে **Secret** যোগ করুন (OpenRouter/provider-এর API key)।
5. `AI_MODEL` plain-text variable রাখুন। Default: `openai/gpt-4o-mini`; provider-এ আপনার অ্যাকাউন্টের জন্য অনুমোদিত model নির্বাচন করুন।
6. `AI_API_URL` default OpenRouter endpoint। অন্য OpenAI-compatible provider ব্যবহার করলে তার chat completions endpoint দিন।
7. Save and Deploy করুন।

## ২. Backend পরীক্ষা
Browser-এ `https://YOUR-WORKER.workers.dev/api/health` খুলুন। JSON-এ `ok:true` ও `configured:true` দেখা উচিত। `configured:false` হলে secret/model settings পরীক্ষা করুন।

## ৩. অ্যাপের সঙ্গে যুক্ত করুন
1. AIZORA Universal App Builder খুলুন।
2. AI Backend URL ঘরে আপনার Worker URL দিন, শেষে `/api` লিখবেন না।
3. বাংলা নির্দেশ দিন, যেমন: `HTML/CSS/JavaScript দিয়ে মোবাইল উপযোগী একটি সুন্দর ক্যালকুলেটর বানাও`.
4. Code AI চাপুন। ফলাফল এলে একটি প্রজেক্ট খুলে `প্রজেক্টে ফাইল হিসেবে রাখুন` চাপুন।

## নিরাপত্তা ও খরচ
- API key শুধু Cloudflare Worker Secret-এ রাখুন।
- AI provider usage-এ টাকা লাগতে পারে; provider-এর quota/pricing পরীক্ষা করুন।
- Public Worker-এ অপব্যবহারের ঝুঁকি থাকে। production ব্যবহারের আগে Cloudflare rate limiting / abuse protection এবং নির্দিষ্ট origin policy configure করুন। ALLOWED_ORIGINS ভেরিয়েবল comma-separated origin list হিসেবে সেট করা যায়; allowed origin-এ অ্যাপটি হোস্ট করুন।
- এই AI endpoint code তৈরি করে, কিন্তু code execute, APK compile বা Android build নিজে করে না। APK build-এর জন্য GitHub Actions workflow আলাদা।
